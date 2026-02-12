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

      // If payment was approved, handle subscription recurrence
      if (dbStatus === "paid") {
        const { data: paymentRecord } = await supabase
          .from("payments")
          .select("subscription_id, client_id, amount, description")
          .eq("transaction_id", paymentId.toString())
          .single();

        if (paymentRecord?.subscription_id) {
          // Get current subscription data
          const { data: subscription } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("id", paymentRecord.subscription_id)
            .single();

          if (subscription) {
            // Calculate next payment date: same day next month
            const currentDueDate = new Date(subscription.next_payment);
            const nextPaymentDate = new Date(currentDueDate);
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
            
            // Handle month overflow (e.g., Jan 31 -> Feb 28)
            if (nextPaymentDate.getDate() !== currentDueDate.getDate()) {
              nextPaymentDate.setDate(0); // Go to last day of previous month
            }

            console.log("Recurrence: Current due date:", currentDueDate.toISOString());
            console.log("Recurrence: Next payment date:", nextPaymentDate.toISOString());

            // Update subscription with new next_payment date
            await supabase
              .from("subscriptions")
              .update({
                status: "active",
                next_payment: nextPaymentDate.toISOString(),
              })
              .eq("id", paymentRecord.subscription_id);

            // Create new pending payment for next month
            const { error: newPaymentError } = await supabase
              .from("payments")
              .insert({
                client_id: subscription.client_id,
                subscription_id: subscription.id,
                amount: subscription.value,
                status: "pending",
                payment_method: "PIX",
                description: `Cobrança - ${subscription.plan_name}`,
                due_date: nextPaymentDate.toISOString(),
              });

            if (newPaymentError) {
              console.error("Error creating next month payment:", newPaymentError);
            } else {
              console.log("Created next month payment for:", nextPaymentDate.toISOString());
            }

            // Create invoice for the paid payment with plan description
            const year = new Date().getFullYear();
            const month = String(new Date().getMonth() + 1).padStart(2, "0");
            const invoiceNumber = `NF-${year}${month}-${paymentId.toString().slice(-4)}`;
            const invoiceDescription = `Valor pago referente ao plano ativo: ${subscription.plan_name}`;

            await supabase
              .from("invoices")
              .insert({
                payment_id: paymentRecord.subscription_id ? undefined : paymentId.toString(),
                client_id: paymentRecord.client_id,
                number: invoiceNumber,
                amount: paymentRecord.amount,
                status: "issued",
                description: invoiceDescription,
              });

            console.log("Invoice created:", invoiceNumber, "with description:", invoiceDescription);
            console.log("Subscription recurrence completed for payment:", paymentId);
          }
        }

        // Send WhatsApp payment confirmation
        if (paymentRecord?.client_id) {
          try {
            const { data: client } = await supabase
              .from("clients")
              .select("id, name, phone")
              .eq("id", paymentRecord.client_id)
              .single();

            if (client?.phone) {
              let phone = client.phone.replace(/\D/g, "");
              if (!phone.startsWith("55")) phone = "55" + phone;

              const formattedAmount = `R$ ${paymentRecord.amount.toFixed(2).replace(".", ",")}`;
              const planName = paymentRecord.description?.replace("Cobrança - ", "") || "Assinatura";

              // Fetch template from DB
              const { data: templateData } = await supabase
                .from("whatsapp_templates")
                .select("*")
                .eq("template_key", "payment_confirmed")
                .eq("is_active", true)
                .single();

              let confirmMessage: string;
              let sendImage = true;
              let sendButton = true;

              if (templateData) {
                confirmMessage = templateData.message_template
                  .replace(/\{\{client_name\}\}/g, client.name)
                  .replace(/\{\{plan_name\}\}/g, planName)
                  .replace(/\{\{amount\}\}/g, formattedAmount);
                sendButton = templateData.button_enabled;
              } else {
                confirmMessage = `Ola ${client.name}! 💈\n\n` +
                  `✅ *Pagamento confirmado!*\n\n` +
                  `Recebemos seu pagamento de *${formattedAmount}* referente ao plano *${planName}* com sucesso.\n\n` +
                  `Obrigado por manter sua assinatura em dia!\n\n` +
                  `Qualquer duvida, estamos a disposicao.`;
              }

              const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

              const whatsappResponse = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${supabaseAnonKey}`,
                },
                body: JSON.stringify({
                  phone,
                  message: confirmMessage,
                  clientId: client.id,
                  type: "payment_confirmed_auto",
                  sendImage,
                  imageUrl: templateData?.image_url || undefined,
                  sendButton,
                }),
              });

              console.log("WhatsApp payment confirmation sent:", whatsappResponse.status);
            }
          } catch (whatsappErr: any) {
            console.error("Error sending WhatsApp confirmation:", whatsappErr.message);
          }
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
