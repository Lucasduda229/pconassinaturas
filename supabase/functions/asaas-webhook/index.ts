import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("ASAAS Webhook received:", JSON.stringify(payload, null, 2));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { event, payment, subscription } = payload;

    // Status mapping from ASAAS to our system
    const paymentStatusMap: Record<string, string> = {
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

    const subscriptionStatusMap: Record<string, string> = {
      ACTIVE: "active",
      INACTIVE: "inactive",
      EXPIRED: "overdue",
    };

    // Helper function to create notification
    const createNotification = async (clientId: string, type: string, message: string) => {
      try {
        const { error } = await supabase.from("notifications").insert({
          client_id: clientId,
          type: type,
          message: message,
          status: "sent",
        });
        
        if (error) {
          console.error("Error creating notification:", error);
        } else {
          console.log(`Notification created for client ${clientId}: ${type}`);
        }
      } catch (err) {
        console.error("Error in createNotification:", err);
      }
    };

    // Helper function to get client_id from subscription
    const getClientIdFromSubscription = async (subscriptionId: string): Promise<string | null> => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("client_id")
        .eq("id", subscriptionId)
        .maybeSingle();
      
      if (error || !data) {
        console.error("Error getting client_id:", error);
        return null;
      }
      return data.client_id;
    };

    switch (event) {
      // Payment events
      case "PAYMENT_RECEIVED":
      case "PAYMENT_CONFIRMED": {
        if (payment?.externalReference) {
          const newStatus = paymentStatusMap[payment.status] || "paid";
          
          // Update payment
          const { error } = await supabase
            .from("payments")
            .update({
              status: newStatus,
              paid_at: payment.paymentDate || new Date().toISOString(),
              transaction_id: payment.id,
              payment_method: payment.billingType?.toLowerCase(),
            })
            .eq("subscription_id", payment.externalReference);

          if (error) {
            console.error("Error updating payment:", error);
          } else {
            console.log(`Payment for subscription ${payment.externalReference} updated to ${newStatus}`);
          }

          // Create notification
          const clientId = await getClientIdFromSubscription(payment.externalReference);
          if (clientId) {
            const amount = payment.value ? 
              new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.value) : '';
            await createNotification(
              clientId,
              "payment_received",
              `Pagamento de ${amount} recebido com sucesso! Obrigado.`
            );
          }
        }
        break;
      }

      case "PAYMENT_CREATED": {
        if (payment?.externalReference) {
          // Create notification for new charge
          const clientId = await getClientIdFromSubscription(payment.externalReference);
          if (clientId) {
            const amount = payment.value ? 
              new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.value) : '';
            const dueDate = payment.dueDate ? 
              new Date(payment.dueDate).toLocaleDateString('pt-BR') : '';
            await createNotification(
              clientId,
              "payment_due",
              `Nova cobrança gerada: ${amount}. Vencimento: ${dueDate}.`
            );
          }
        }
        break;
      }

      case "PAYMENT_OVERDUE": {
        if (payment?.externalReference) {
          const { error } = await supabase
            .from("payments")
            .update({
              status: "failed",
              transaction_id: payment.id,
            })
            .eq("subscription_id", payment.externalReference);

          if (error) {
            console.error("Error updating payment:", error);
          }

          // Create notification
          const clientId = await getClientIdFromSubscription(payment.externalReference);
          if (clientId) {
            const amount = payment.value ? 
              new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.value) : '';
            await createNotification(
              clientId,
              "payment_failed",
              `Pagamento de ${amount} está em atraso. Por favor, regularize.`
            );
          }
        }
        break;
      }

      case "PAYMENT_REFUNDED": {
        if (payment?.externalReference) {
          const { error } = await supabase
            .from("payments")
            .update({
              status: "refunded",
              transaction_id: payment.id,
            })
            .eq("subscription_id", payment.externalReference);

          if (error) {
            console.error("Error updating payment:", error);
          }

          // Create notification
          const clientId = await getClientIdFromSubscription(payment.externalReference);
          if (clientId) {
            const amount = payment.value ? 
              new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.value) : '';
            await createNotification(
              clientId,
              "payment_failed",
              `Pagamento de ${amount} foi estornado.`
            );
          }
        }
        break;
      }

      case "PAYMENT_UPDATED": {
        if (payment?.externalReference) {
          const newStatus = paymentStatusMap[payment.status] || "pending";
          
          const { error } = await supabase
            .from("payments")
            .update({
              status: newStatus,
              paid_at: payment.paymentDate || null,
              transaction_id: payment.id,
              payment_method: payment.billingType?.toLowerCase(),
            })
            .eq("subscription_id", payment.externalReference);

          if (error) {
            console.error("Error updating payment:", error);
          }
        }
        break;
      }

      // Subscription events
      case "SUBSCRIPTION_RENEWED": {
        if (subscription?.externalReference) {
          const { error } = await supabase
            .from("subscriptions")
            .update({
              status: "active",
              next_payment: subscription.nextDueDate,
            })
            .eq("id", subscription.externalReference);

          if (error) {
            console.error("Error updating subscription:", error);
          }

          // Create notification
          const clientId = await getClientIdFromSubscription(subscription.externalReference);
          if (clientId) {
            await createNotification(
              clientId,
              "subscription_renewed",
              `Sua assinatura foi renovada com sucesso!`
            );
          }
        }
        break;
      }

      case "SUBSCRIPTION_CREATED":
      case "SUBSCRIPTION_UPDATED": {
        if (subscription?.externalReference) {
          const newStatus = subscriptionStatusMap[subscription.status] || "active";
          
          const { error } = await supabase
            .from("subscriptions")
            .update({
              status: newStatus,
              next_payment: subscription.nextDueDate,
            })
            .eq("id", subscription.externalReference);

          if (error) {
            console.error("Error updating subscription:", error);
          }
        }
        break;
      }

      case "SUBSCRIPTION_DELETED": {
        if (subscription?.externalReference) {
          const { error } = await supabase
            .from("subscriptions")
            .update({
              status: "cancelled",
            })
            .eq("id", subscription.externalReference);

          if (error) {
            console.error("Error updating subscription:", error);
          }

          // Create notification
          const clientId = await getClientIdFromSubscription(subscription.externalReference);
          if (clientId) {
            await createNotification(
              clientId,
              "payment_failed",
              `Sua assinatura foi cancelada.`
            );
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event: ${event}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Webhook error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
