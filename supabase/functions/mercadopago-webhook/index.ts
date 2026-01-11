import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MERCADOPAGO_API_URL = "https://api.mercadopago.com";

// Validate Mercado Pago webhook signature
async function validateSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string,
  secret: string
): Promise<boolean> {
  if (!xSignature || !xRequestId) {
    console.log("Missing signature headers");
    return false;
  }

  try {
    // Parse x-signature header (format: "ts=timestamp,v1=hash")
    const parts: Record<string, string> = {};
    xSignature.split(",").forEach((part) => {
      const [key, value] = part.split("=");
      if (key && value) {
        parts[key.trim()] = value.trim();
      }
    });

    const ts = parts["ts"];
    const v1 = parts["v1"];

    if (!ts || !v1) {
      console.log("Invalid signature format");
      return false;
    }

    // Build the manifest string
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

    // Create HMAC SHA256 using Web Crypto API
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(manifest);

    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", key, messageData);
    const hashHex = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const isValid = hashHex === v1;
    console.log("Signature validation:", { isValid, computed: hashHex.substring(0, 20) + "...", received: v1.substring(0, 20) + "..." });
    return isValid;
  } catch (error) {
    console.error("Signature validation error:", error);
    return false;
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    const webhookSecret = Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET");
    
    if (!accessToken) {
      console.error("MERCADOPAGO_ACCESS_TOKEN not configured");
      return new Response("OK", { status: 200 });
    }

    // Get signature headers
    const xSignature = req.headers.get("x-signature");
    const xRequestId = req.headers.get("x-request-id");

    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body));

    // Validate signature if secret is configured
    if (webhookSecret) {
      const dataId = body.data?.id?.toString() || "";
      const isValid = await validateSignature(xSignature, xRequestId, dataId, webhookSecret);
      
      if (!isValid) {
        console.error("Invalid webhook signature - rejecting request");
        return new Response("Invalid signature", { status: 401 });
      }
      console.log("Webhook signature validated successfully");
    } else {
      console.warn("MERCADOPAGO_WEBHOOK_SECRET not configured - skipping signature validation");
    }

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
