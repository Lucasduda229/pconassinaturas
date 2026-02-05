import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLIENT_AREA_URL = "https://www.assinaturaspcon.sbs/cliente";
const PROMO_IMAGE_URL = "https://pconassinaturas.lovable.app/images/whatsapp-promo-v2.png";

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

    // Helper function to send WhatsApp message
    const sendWhatsAppMessage = async (clientId: string, phone: string, message: string, messageType: string) => {
      try {
        const apiKey = Deno.env.get("BTZAP_API_KEY");
        const instanceId = Deno.env.get("BTZAP_INSTANCE_ID");

        if (!apiKey || !instanceId) {
          console.log("BTZap not configured, skipping WhatsApp message");
          return;
        }

        // Format phone number
        let formattedPhone = phone.replace(/\D/g, "");
        if (!formattedPhone.startsWith("55")) {
          formattedPhone = "55" + formattedPhone;
        }

        const cacheBustedImageUrl = `${PROMO_IMAGE_URL}?v=${Date.now()}`;

        const response = await fetch("https://adm.btzap.com.br/api/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            number: formattedPhone,
            type: "image",
            message: message,
            media_url: cacheBustedImageUrl,
            instance_id: instanceId,
            access_token: apiKey,
          }),
        });

        const result = await response.json();
        console.log(`WhatsApp ${messageType} sent to ${formattedPhone}:`, result.status);

        if (result.status === "success") {
          await supabase.from("whatsapp_messages").insert({
            client_id: clientId,
            phone: formattedPhone,
            message: message,
            message_type: messageType,
            btzap_message_id: result.message?.key?.id || null,
            remote_jid: result.message?.key?.remoteJid || null,
            status: "sent",
          });
        }
      } catch (err) {
        console.error("Error sending WhatsApp message:", err);
      }
    };

    // Helper function to get client data
    const getClientData = async (clientId: string) => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, phone")
        .eq("id", clientId)
        .maybeSingle();
      
      if (error) {
        console.error("Error getting client data:", error);
        return null;
      }
      return data;
    };

    // Helper function to get subscription by asaas_id
    const getSubscriptionByAsaasId = async (asaasId: string) => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("id, client_id, plan_name, value, status")
        .eq("asaas_id", asaasId)
        .maybeSingle();
      
      if (error) {
        console.error("Error getting subscription by asaas_id:", error);
        return null;
      }
      return data;
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

    // Helper function to get client_id from payment by asaas_id
    const getClientIdFromPayment = async (asaasId: string): Promise<string | null> => {
      const { data, error } = await supabase
        .from("payments")
        .select("client_id")
        .eq("asaas_id", asaasId)
        .maybeSingle();
      
      if (error || !data) {
        console.error("Error getting client_id from payment:", error);
        return null;
      }
      return data.client_id;
    };

    // Helper function to update payment by asaas_id (for single charges)
    const updatePaymentByAsaasId = async (asaasId: string, updateData: Record<string, any>) => {
      const { data, error } = await supabase
        .from("payments")
        .update(updateData)
        .eq("asaas_id", asaasId)
        .select()
        .maybeSingle();
      
      return { data, error };
    };

    // Helper function to update or create payment for subscription
    const upsertSubscriptionPayment = async (paymentData: any, subscriptionData: any) => {
      // Check if payment already exists
      const { data: existingPayment } = await supabase
        .from("payments")
        .select("id")
        .eq("asaas_id", paymentData.id)
        .maybeSingle();

      if (existingPayment) {
        // Update existing payment
        const { data, error } = await supabase
          .from("payments")
          .update({
            status: paymentStatusMap[paymentData.status] || "pending",
            paid_at: paymentData.paymentDate || null,
            payment_method: paymentData.billingType?.toLowerCase(),
          })
          .eq("asaas_id", paymentData.id)
          .select()
          .single();
        
        return { data, error, isNew: false };
      } else {
        // Create new payment
        const { data, error } = await supabase
          .from("payments")
          .insert({
            client_id: subscriptionData.client_id,
            subscription_id: subscriptionData.id,
            amount: paymentData.value,
            status: paymentStatusMap[paymentData.status] || "pending",
            asaas_id: paymentData.id,
            description: paymentData.description || subscriptionData.plan_name,
            payment_method: paymentData.billingType?.toLowerCase(),
          })
          .select()
          .single();
        
        return { data, error, isNew: true };
      }
    };

    switch (event) {
      // Payment events
      case "PAYMENT_RECEIVED":
      case "PAYMENT_CONFIRMED": {
        const newStatus = paymentStatusMap[payment?.status] || "paid";
        const updateData = {
          status: newStatus,
          paid_at: payment?.paymentDate || new Date().toISOString(),
          transaction_id: payment?.id,
          payment_method: payment?.billingType?.toLowerCase(),
        };

        let clientId: string | null = null;

        // Try to update by asaas_id first (single charges or subscription payments)
        if (payment?.id) {
          const { data, error } = await updatePaymentByAsaasId(payment.id, updateData);
          if (!error && data) {
            console.log(`Payment ${payment.id} updated to ${newStatus} (by asaas_id)`);
            clientId = data.client_id;
          }
        }

        // If payment not found and it's from a subscription, create/update it
        if (!clientId && payment?.subscription) {
          const subscriptionData = await getSubscriptionByAsaasId(payment.subscription);
          if (subscriptionData) {
            const { data, error } = await upsertSubscriptionPayment(payment, subscriptionData);
            if (!error && data) {
              // Update the status to paid
              await supabase
                .from("payments")
                .update({ status: newStatus, paid_at: payment?.paymentDate || new Date().toISOString() })
                .eq("id", data.id);
              
              clientId = subscriptionData.client_id;
              console.log(`Subscription payment ${payment.id} created/updated to ${newStatus}`);
            }
          }
        }

        // Auto-generate invoice when payment is confirmed
        if (clientId) {
          const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
          const { error: invoiceError } = await supabase
            .from("invoices")
            .insert({
              client_id: clientId,
              number: invoiceNumber,
              amount: payment?.value,
              status: "paid",
            });

          if (invoiceError) {
            console.error("Error creating invoice:", invoiceError);
          } else {
            console.log(`Invoice ${invoiceNumber} created for client ${clientId}`);
          }

          // Create notification
          const amount = payment?.value ? 
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.value) : '';
          await createNotification(
            clientId,
            "payment_received",
            `Pagamento de ${amount} recebido com sucesso! Fatura ${invoiceNumber} gerada.`
          );

          // Send WhatsApp confirmation message
          const clientData = await getClientData(clientId);
          if (clientData?.phone) {
            const formattedAmount = payment?.value ? 
              `R$ ${payment.value.toFixed(2).replace(".", ",")}` : '';
            
            const whatsappMessage = `Ola ${clientData.name}! 💈\n\n` +
              `✅ *Pagamento confirmado!*\n\n` +
              `Recebemos seu pagamento de *${formattedAmount}* com sucesso.\n\n` +
              `📄 *Fatura:* ${invoiceNumber}\n\n` +
              `Obrigado por manter sua assinatura em dia!\n\n` +
              `📱 *Acesse sua area do cliente:*\n${CLIENT_AREA_URL}\n\n` +
              `Qualquer duvida, estamos a disposicao.`;

            await sendWhatsAppMessage(
              clientId,
              clientData.phone,
              whatsappMessage,
              "payment_confirmed"
            );
          }
        }
        break;
      }

      case "PAYMENT_CREATED": {
        let clientId: string | null = null;

        // Check if this payment is from a subscription
        if (payment?.subscription) {
          const subscriptionData = await getSubscriptionByAsaasId(payment.subscription);
          
          if (subscriptionData) {
            // Create payment record for subscription
            const { data, error, isNew } = await upsertSubscriptionPayment(payment, subscriptionData);
            
            if (!error && data) {
              clientId = subscriptionData.client_id;
              console.log(`Payment ${payment.id} ${isNew ? 'created' : 'updated'} for subscription ${payment.subscription}`);
            } else {
              console.error("Error creating subscription payment:", error);
            }
          } else {
            console.log(`Subscription ${payment.subscription} not found in local database`);
          }
        } else {
          // Try to get client from existing payment
          if (payment?.id) {
            clientId = await getClientIdFromPayment(payment.id);
          }
        }

        if (clientId) {
          const amount = payment?.value ? 
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.value) : '';
          const dueDate = payment?.dueDate ? 
            new Date(payment.dueDate).toLocaleDateString('pt-BR') : '';
          await createNotification(
            clientId,
            "payment_due",
            `Nova cobrança gerada: ${amount}. Vencimento: ${dueDate}.`
          );
        }
        break;
      }

      case "PAYMENT_OVERDUE": {
        const updateData = {
          status: "failed",
          transaction_id: payment?.id,
        };

        let clientId: string | null = null;

        // Try to update by asaas_id first
        if (payment?.id) {
          const { data, error } = await updatePaymentByAsaasId(payment.id, updateData);
          if (!error && data) {
            console.log(`Payment ${payment.id} marked as overdue (by asaas_id)`);
            clientId = data.client_id;
          }
        }

        // If payment from subscription
        if (!clientId && payment?.subscription) {
          const subscriptionData = await getSubscriptionByAsaasId(payment.subscription);
          if (subscriptionData) {
            // Update subscription status
            await supabase
              .from("subscriptions")
              .update({ status: "overdue" })
              .eq("asaas_id", payment.subscription);
            
            clientId = subscriptionData.client_id;
          }
        }

        // Create notification
        if (clientId) {
          const amount = payment?.value ? 
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.value) : '';
          await createNotification(
            clientId,
            "payment_failed",
            `Pagamento de ${amount} está em atraso. Por favor, regularize.`
          );
        }
        break;
      }

      case "PAYMENT_REFUNDED": {
        const updateData = {
          status: "refunded",
          transaction_id: payment?.id,
        };

        let clientId: string | null = null;

        // Try to update by asaas_id first
        if (payment?.id) {
          const { data, error } = await updatePaymentByAsaasId(payment.id, updateData);
          if (!error && data) {
            console.log(`Payment ${payment.id} marked as refunded (by asaas_id)`);
            clientId = data.client_id;
          }
        }

        // Create notification
        if (clientId) {
          const amount = payment?.value ? 
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.value) : '';
          await createNotification(
            clientId,
            "payment_failed",
            `Pagamento de ${amount} foi estornado.`
          );
        }
        break;
      }

      case "PAYMENT_UPDATED": {
        const newStatus = paymentStatusMap[payment?.status] || "pending";
        const updateData = {
          status: newStatus,
          paid_at: payment?.paymentDate || null,
          transaction_id: payment?.id,
          payment_method: payment?.billingType?.toLowerCase(),
        };

        // Try to update by asaas_id first
        if (payment?.id) {
          const { data, error } = await updatePaymentByAsaasId(payment.id, updateData);
          if (!error && data) {
            console.log(`Payment ${payment.id} updated to ${newStatus} (by asaas_id)`);
          }
        }

        // Also check if it's a subscription payment that wasn't created yet
        if (payment?.subscription) {
          const subscriptionData = await getSubscriptionByAsaasId(payment.subscription);
          if (subscriptionData) {
            await upsertSubscriptionPayment(payment, subscriptionData);
          }
        }
        break;
      }

      // Subscription events
      case "SUBSCRIPTION_RENEWED": {
        // Find subscription by asaas_id
        const subscriptionData = await getSubscriptionByAsaasId(subscription?.id);
        
        if (subscriptionData) {
          const { error } = await supabase
            .from("subscriptions")
            .update({
              status: "active",
              next_payment: subscription.nextDueDate,
            })
            .eq("id", subscriptionData.id);

          if (error) {
            console.error("Error updating subscription:", error);
          } else {
            console.log(`Subscription ${subscription.id} renewed`);
          }

          // Create notification
          await createNotification(
            subscriptionData.client_id,
            "subscription_renewed",
            `Sua assinatura foi renovada com sucesso!`
          );
        }
        break;
      }

      case "SUBSCRIPTION_CREATED": {
        // When subscription is first created, DO NOT update next_payment
        // The frontend already saved the correct initial date
        // ASAAS returns nextDueDate pointing to the NEXT cycle, not the first
        const subscriptionData = await getSubscriptionByAsaasId(subscription?.id);
        
        if (subscriptionData) {
          console.log(`Subscription ${subscription.id} created in ASAAS - keeping original next_payment date`);
          // Only update status if needed, but NOT the next_payment date
          const newStatus = subscriptionStatusMap[subscription.status] || "active";
          
          if (subscriptionData.status !== newStatus) {
            const { error } = await supabase
              .from("subscriptions")
              .update({ status: newStatus })
              .eq("id", subscriptionData.id);

            if (error) {
              console.error("Error updating subscription status:", error);
            }
          }
        }
        break;
      }

      case "SUBSCRIPTION_UPDATED": {
        // For updates (not creation), we can update the next_payment
        // But only if it's a renewal or manual change
        const subscriptionData = await getSubscriptionByAsaasId(subscription?.id);
        
        if (subscriptionData) {
          const newStatus = subscriptionStatusMap[subscription.status] || "active";
          
          const { error } = await supabase
            .from("subscriptions")
            .update({
              status: newStatus,
              // Update next_payment only for SUBSCRIPTION_UPDATED, not CREATED
              next_payment: subscription.nextDueDate,
            })
            .eq("id", subscriptionData.id);

          if (error) {
            console.error("Error updating subscription:", error);
          } else {
            console.log(`Subscription ${subscription.id} updated to ${newStatus}`);
          }
        }
        break;
      }

      case "SUBSCRIPTION_DELETED": {
        // Find subscription by asaas_id
        const subscriptionData = await getSubscriptionByAsaasId(subscription?.id);
        
        if (subscriptionData) {
          const { error } = await supabase
            .from("subscriptions")
            .update({
              status: "cancelled",
            })
            .eq("id", subscriptionData.id);

          if (error) {
            console.error("Error updating subscription:", error);
          } else {
            console.log(`Subscription ${subscription.id} cancelled`);
          }

          // Create notification
          await createNotification(
            subscriptionData.client_id,
            "payment_failed",
            `Sua assinatura foi cancelada.`
          );
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
