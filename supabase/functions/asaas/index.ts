import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");
const ASAAS_BASE_URL = "https://api.asaas.com/v3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to make ASAAS API calls
async function asaasRequest(endpoint: string, method: string = "GET", body?: any) {
  const url = `${ASAAS_BASE_URL}${endpoint}`;
  console.log(`ASAAS Request: ${method} ${url}`);
  
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      "access_token": ASAAS_API_KEY!,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();
  
  if (!response.ok) {
    console.error("ASAAS Error:", data);
    throw new Error(data.errors?.[0]?.description || "Erro na API da ASAAS");
  }

  console.log("ASAAS Response:", data);
  return data;
}

// Create Supabase client
function getSupabaseClient(authHeader: string) {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const body = req.method !== "GET" ? await req.json() : null;
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = getSupabaseClient(authHeader);

    console.log(`Action: ${action}, Method: ${req.method}`);

    let result;

    switch (action) {
      // ========== CUSTOMERS ==========
      case "createCustomer": {
        const { name, email, cpfCnpj, phone } = body;
        
        // First try to find existing customer by email
        try {
          const existingCustomers = await asaasRequest(`/customers?email=${encodeURIComponent(email)}`);
          if (existingCustomers.data && existingCustomers.data.length > 0) {
            console.log("Customer already exists, returning existing:", existingCustomers.data[0].id);
            result = existingCustomers.data[0];
            break;
          }
        } catch (e) {
          console.log("Error searching for existing customer, will try to create:", e);
        }
        
        // Build customer payload - cpfCnpj is optional
        const customerPayload: any = {
          name,
          email,
          phone: phone?.replace(/\D/g, "") || undefined,
        };
        
        // Only add cpfCnpj if it's valid (11 or 14 digits)
        const cleanCpfCnpj = cpfCnpj?.replace(/\D/g, "");
        if (cleanCpfCnpj && (cleanCpfCnpj.length === 11 || cleanCpfCnpj.length === 14)) {
          customerPayload.cpfCnpj = cleanCpfCnpj;
        }
        
        result = await asaasRequest("/customers", "POST", customerPayload);
        break;
      }

      case "getCustomer": {
        const customerId = url.searchParams.get("customerId");
        result = await asaasRequest(`/customers/${customerId}`);
        break;
      }

      case "listCustomers": {
        result = await asaasRequest("/customers");
        break;
      }

      case "syncCustomerToAsaas": {
        const { clientId } = body;
        
        // Get client from database
        const { data: client, error } = await supabase
          .from("clients")
          .select("*")
          .eq("id", clientId)
          .maybeSingle();

        if (error || !client) {
          throw new Error("Cliente não encontrado");
        }

        // First try to find existing customer by email
        try {
          const existingCustomers = await asaasRequest(`/customers?email=${encodeURIComponent(client.email)}`);
          if (existingCustomers.data && existingCustomers.data.length > 0) {
            console.log("Customer already exists, returning existing:", existingCustomers.data[0].id);
            result = existingCustomers.data[0];
            break;
          }
        } catch (e) {
          console.log("Error searching for existing customer, will try to create:", e);
        }

        // Build customer payload - cpfCnpj is optional
        const syncPayload: any = {
          name: client.name,
          email: client.email,
          phone: client.phone?.replace(/\D/g, "") || undefined,
          externalReference: client.id,
        };
        
        // Only add cpfCnpj if it's valid (11 or 14 digits)
        const cleanDoc = client.document?.replace(/\D/g, "");
        if (cleanDoc && (cleanDoc.length === 11 || cleanDoc.length === 14)) {
          syncPayload.cpfCnpj = cleanDoc;
        }

        result = await asaasRequest("/customers", "POST", syncPayload);
        break;
      }

      // ========== PAYMENTS/CHARGES ==========
      case "createPayment": {
        const { customer, billingType, value, dueDate, description, externalReference } = body;
        result = await asaasRequest("/payments", "POST", {
          customer,
          billingType, // BOLETO, CREDIT_CARD, PIX
          value,
          dueDate,
          description,
          externalReference,
        });
        break;
      }

      case "getPayment": {
        const paymentId = url.searchParams.get("paymentId");
        result = await asaasRequest(`/payments/${paymentId}`);
        break;
      }

      case "listPayments": {
        const customerId = url.searchParams.get("customerId");
        const endpoint = customerId ? `/payments?customer=${customerId}` : "/payments";
        result = await asaasRequest(endpoint);
        break;
      }

      case "getPixQrCode": {
        const paymentId = url.searchParams.get("paymentId");
        result = await asaasRequest(`/payments/${paymentId}/pixQrCode`);
        break;
      }

      case "getBoletoData": {
        const paymentId = url.searchParams.get("paymentId");
        result = await asaasRequest(`/payments/${paymentId}/identificationField`);
        break;
      }

      // ========== SUBSCRIPTIONS ==========
      case "createSubscription": {
        const { customer, billingType, value, nextDueDate, cycle, description, externalReference } = body;
        result = await asaasRequest("/subscriptions", "POST", {
          customer,
          billingType,
          value,
          nextDueDate,
          cycle, // WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, SEMIANNUALLY, YEARLY
          description,
          externalReference,
        });
        break;
      }

      case "getSubscription": {
        const subscriptionId = url.searchParams.get("subscriptionId");
        result = await asaasRequest(`/subscriptions/${subscriptionId}`);
        break;
      }

      case "listSubscriptions": {
        const customerId = url.searchParams.get("customerId");
        const endpoint = customerId ? `/subscriptions?customer=${customerId}` : "/subscriptions";
        result = await asaasRequest(endpoint);
        break;
      }

      case "cancelSubscription": {
        const { subscriptionId } = body;
        result = await asaasRequest(`/subscriptions/${subscriptionId}`, "DELETE");
        break;
      }

      case "getSubscriptionPayments": {
        const subscriptionId = url.searchParams.get("subscriptionId");
        result = await asaasRequest(`/subscriptions/${subscriptionId}/payments`);
        break;
      }

      // ========== NOTIFICATIONS ==========
      case "getNotificationSettings": {
        const customerId = url.searchParams.get("customerId");
        result = await asaasRequest(`/customers/${customerId}/notifications`);
        break;
      }

      case "updateNotificationSettings": {
        const { customerId, emailEnabledForCustomer, smsEnabledForCustomer, phoneCallEnabledForCustomer } = body;
        result = await asaasRequest(`/customers/${customerId}/notifications`, "POST", {
          emailEnabledForCustomer,
          smsEnabledForCustomer,
          phoneCallEnabledForCustomer,
        });
        break;
      }

      // ========== INVOICES ==========
      case "getInvoice": {
        const paymentId = url.searchParams.get("paymentId");
        result = await asaasRequest(`/payments/${paymentId}/invoices`);
        break;
      }

      // ========== SYNC OPERATIONS ==========
      case "syncPaymentStatus": {
        const { paymentId, asaasPaymentId } = body;
        
        // Get payment status from ASAAS
        const asaasPayment = await asaasRequest(`/payments/${asaasPaymentId}`);
        
        // Map ASAAS status to our status
        const statusMap: Record<string, string> = {
          PENDING: "pending",
          RECEIVED: "paid",
          CONFIRMED: "paid",
          OVERDUE: "failed",
          REFUNDED: "refunded",
          RECEIVED_IN_CASH: "paid",
          REFUND_REQUESTED: "refunded",
          CHARGEBACK_REQUESTED: "failed",
          CHARGEBACK_DISPUTE: "failed",
          AWAITING_CHARGEBACK_REVERSAL: "failed",
          DUNNING_REQUESTED: "failed",
          DUNNING_RECEIVED: "paid",
          AWAITING_RISK_ANALYSIS: "pending",
        };

        const newStatus = statusMap[asaasPayment.status] || "pending";

        // Update payment in database
        const { error } = await supabase
          .from("payments")
          .update({ 
            status: newStatus,
            paid_at: asaasPayment.paymentDate || null,
            transaction_id: asaasPaymentId,
          })
          .eq("id", paymentId);

        if (error) throw error;

        result = { success: true, status: newStatus };
        break;
      }

      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
