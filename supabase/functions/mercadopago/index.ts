import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MERCADOPAGO_API_URL = "https://api.mercadopago.com";

interface CreatePixPaymentRequest {
  amount: number;
  description: string;
  clientId: string;
  clientEmail: string;
  clientName: string;
  clientDocument?: string;
  subscriptionId?: string;
}

interface CreatePreferenceRequest {
  amount: number;
  title: string;
  description?: string;
  clientEmail: string;
  externalReference?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) {
      console.error("MERCADOPAGO_ACCESS_TOKEN not configured");
      throw new Error("Mercado Pago não configurado");
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    console.log("Mercado Pago action:", action);

    // Create PIX payment
    if (action === "create-pix") {
      const body: CreatePixPaymentRequest = await req.json();
      console.log("Creating PIX payment:", { 
        amount: body.amount, 
        description: body.description,
        clientEmail: body.clientEmail 
      });

      // Create payment via Mercado Pago API
      const paymentData = {
        transaction_amount: body.amount,
        description: body.description,
        payment_method_id: "pix",
        payer: {
          email: body.clientEmail,
          first_name: body.clientName?.split(" ")[0] || "Cliente",
          last_name: body.clientName?.split(" ").slice(1).join(" ") || "",
          identification: body.clientDocument ? {
            type: body.clientDocument.length <= 11 ? "CPF" : "CNPJ",
            number: body.clientDocument.replace(/[^\d]/g, ""),
          } : undefined,
        },
        notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercadopago-webhook`,
      };

      console.log("Sending to Mercado Pago API:", JSON.stringify(paymentData));

      const response = await fetch(`${MERCADOPAGO_API_URL}/v1/payments`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify(paymentData),
      });

      // Check for empty response
      const responseText = await response.text();
      console.log("Mercado Pago response status:", response.status);
      console.log("Mercado Pago response body:", responseText);

      if (!responseText) {
        console.error("Empty response from Mercado Pago - check if access token is valid");
        throw new Error("Resposta vazia do Mercado Pago. Verifique se o token de acesso está correto.");
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse Mercado Pago response:", responseText);
        throw new Error("Resposta inválida do Mercado Pago");
      }

      if (!response.ok) {
        console.error("Mercado Pago error:", result);
        const errorMsg = result.message || result.error || (result.cause && result.cause[0]?.description) || "Erro ao criar pagamento PIX";
        throw new Error(errorMsg);
      }

      console.log("PIX payment created:", result.id);

      // Save to local database
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error: dbError } = await supabase.from("payments").insert({
        client_id: body.clientId,
        subscription_id: body.subscriptionId || null,
        amount: body.amount,
        status: "pending",
        payment_method: "PIX",
        description: body.description,
        asaas_id: null, // Not using ASAAS
        transaction_id: result.id?.toString(),
      });

      if (dbError) {
        console.error("Error saving payment to DB:", dbError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          paymentId: result.id,
          qrCode: result.point_of_interaction?.transaction_data?.qr_code,
          qrCodeBase64: result.point_of_interaction?.transaction_data?.qr_code_base64,
          ticketUrl: result.point_of_interaction?.transaction_data?.ticket_url,
          expirationDate: result.date_of_expiration,
          status: result.status,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check payment status
    if (action === "check-status") {
      const paymentId = url.searchParams.get("paymentId");
      if (!paymentId) {
        throw new Error("paymentId é obrigatório");
      }

      console.log("Checking payment status:", paymentId);

      const response = await fetch(`${MERCADOPAGO_API_URL}/v1/payments/${paymentId}`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Mercado Pago status check error:", result);
        throw new Error(result.message || "Erro ao verificar status");
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: result.status,
          statusDetail: result.status_detail,
          paidAt: result.date_approved,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create preference (for Checkout Bricks)
    if (action === "create-preference") {
      const body: CreatePreferenceRequest = await req.json();
      console.log("Creating preference:", body);

      const preferenceData = {
        items: [
          {
            title: body.title,
            description: body.description || body.title,
            quantity: 1,
            currency_id: "BRL",
            unit_price: body.amount,
          },
        ],
        payer: {
          email: body.clientEmail,
        },
        payment_methods: {
          excluded_payment_types: [
            { id: "credit_card" },
            { id: "debit_card" },
            { id: "ticket" }, // boleto
          ],
          default_payment_method_id: "pix",
        },
        external_reference: body.externalReference,
        notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercadopago-webhook`,
        auto_return: "approved",
      };

      const response = await fetch(`${MERCADOPAGO_API_URL}/checkout/preferences`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preferenceData),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Mercado Pago preference error:", result);
        throw new Error(result.message || "Erro ao criar preferência");
      }

      console.log("Preference created:", result.id);

      return new Response(
        JSON.stringify({
          success: true,
          preferenceId: result.id,
          initPoint: result.init_point,
          sandboxInitPoint: result.sandbox_init_point,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Ação desconhecida: ${action}`);

  } catch (error: any) {
    console.error("Mercado Pago function error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
