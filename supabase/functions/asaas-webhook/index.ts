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

    switch (event) {
      // Payment events
      case "PAYMENT_RECEIVED":
      case "PAYMENT_CONFIRMED":
      case "PAYMENT_OVERDUE":
      case "PAYMENT_REFUNDED":
      case "PAYMENT_UPDATED":
      case "PAYMENT_CREATED": {
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
            .eq("id", payment.externalReference);

          if (error) {
            console.error("Error updating payment:", error);
          } else {
            console.log(`Payment ${payment.externalReference} updated to ${newStatus}`);
          }

          // Create notification for the payment event
          if (payment.customer) {
            const notificationMessages: Record<string, string> = {
              PAYMENT_RECEIVED: "Pagamento recebido com sucesso!",
              PAYMENT_CONFIRMED: "Pagamento confirmado!",
              PAYMENT_OVERDUE: "Pagamento em atraso.",
              PAYMENT_REFUNDED: "Pagamento estornado.",
            };

            if (notificationMessages[event]) {
              // Find client by external reference
              const { data: clients } = await supabase
                .from("clients")
                .select("id")
                .eq("id", payment.externalReference?.split("-")[0])
                .maybeSingle();

              if (clients) {
                await supabase.from("notifications").insert({
                  client_id: clients.id,
                  type: event.toLowerCase().replace("_", "-"),
                  message: notificationMessages[event],
                  status: "sent",
                });
              }
            }
          }
        }
        break;
      }

      // Subscription events
      case "SUBSCRIPTION_CREATED":
      case "SUBSCRIPTION_UPDATED":
      case "SUBSCRIPTION_DELETED":
      case "SUBSCRIPTION_RENEWED": {
        if (subscription?.externalReference) {
          const newStatus = subscriptionStatusMap[subscription.status] || "active";
          
          const { error } = await supabase
            .from("subscriptions")
            .update({
              status: event === "SUBSCRIPTION_DELETED" ? "cancelled" : newStatus,
              next_payment: subscription.nextDueDate,
            })
            .eq("id", subscription.externalReference);

          if (error) {
            console.error("Error updating subscription:", error);
          } else {
            console.log(`Subscription ${subscription.externalReference} updated`);
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
