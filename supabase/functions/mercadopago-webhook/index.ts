import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MERCADOPAGO_API_URL = "https://api.mercadopago.com";

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) {
      console.error("MERCADOPAGO_ACCESS_TOKEN not configured");
      return new Response("OK", { status: 200 });
    }

    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body));

    // Mercado Pago sends different notification types
    const { type, data, action } = body;

    // We're interested in payment notifications
    if (type === "payment" || action === "payment.created" || action === "payment.updated") {
      const paymentId = data?.id;
      
      if (!paymentId) {
        console.log("No payment ID in webhook");
        return new Response("OK", { status: 200 });
      }

      console.log("Processing payment webhook for ID:", paymentId);

      // Fetch payment details from Mercado Pago
      const response = await fetch(`${MERCADOPAGO_API_URL}/v1/payments/${paymentId}`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        console.error("Failed to fetch payment details:", response.status);
        return new Response("OK", { status: 200 });
      }

      const paymentData = await response.json();
      console.log("Payment data from MP:", {
        id: paymentData.id,
        status: paymentData.status,
        status_detail: paymentData.status_detail,
      });

      // Map Mercado Pago status to our status
      let dbStatus = "pending";
      let paidAt = null;

      switch (paymentData.status) {
        case "approved":
          dbStatus = "paid";
          paidAt = paymentData.date_approved || new Date().toISOString();
          break;
        case "pending":
        case "in_process":
          dbStatus = "pending";
          break;
        case "rejected":
        case "cancelled":
          dbStatus = "cancelled";
          break;
        case "refunded":
          dbStatus = "refunded";
          break;
      }

      // Update payment in database
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error: updateError } = await supabase
        .from("payments")
        .update({
          status: dbStatus,
          paid_at: paidAt,
        })
        .eq("transaction_id", paymentId.toString());

      if (updateError) {
        console.error("Error updating payment in DB:", updateError);
      } else {
        console.log("Payment updated successfully:", { paymentId, status: dbStatus });
      }

      // If payment was approved, update subscription status if applicable
      if (dbStatus === "paid") {
        const { data: paymentRecord } = await supabase
          .from("payments")
          .select("subscription_id")
          .eq("transaction_id", paymentId.toString())
          .single();

        if (paymentRecord?.subscription_id) {
          // Calculate next payment date (30 days from now)
          const nextPayment = new Date();
          nextPayment.setDate(nextPayment.getDate() + 30);

          await supabase
            .from("subscriptions")
            .update({
              status: "active",
              next_payment: nextPayment.toISOString(),
            })
            .eq("id", paymentRecord.subscription_id);

          console.log("Subscription updated for payment:", paymentId);
        }
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error: any) {
    console.error("Webhook error:", error);
    // Always return 200 to Mercado Pago to prevent retries
    return new Response("OK", { status: 200 });
  }
});
