import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
  const apiKey = Deno.env.get("BTZAP_API_KEY");
  const instanceId = Deno.env.get("BTZAP_INSTANCE_ID");
  
  if (!apiKey || !instanceId) {
    console.error("BTZap API key or Instance ID not configured");
    return false;
  }

  // Format phone number (remove non-digits and ensure country code)
  let formattedPhone = phone.replace(/\D/g, "");
  if (!formattedPhone.startsWith("55")) {
    formattedPhone = "55" + formattedPhone;
  }

  try {
    console.log(`Sending WhatsApp message to ${formattedPhone}`);
    
    // Send message via BTZap API - using correct endpoint format
    const url = `https://adm.btzap.com.br/api/send_message?access_token=${apiKey}&instance_id=${instanceId}&number=${encodeURIComponent(formattedPhone)}&message=${encodeURIComponent(message)}`;
    
    const response = await fetch(url, {
      method: "POST",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`BTZap API error: ${response.status} - ${errorText}`);
      return false;
    }

    const result = await response.json();
    console.log("BTZap response:", result);
    return true;
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return false;
  }
}

async function createNotification(
  supabase: any,
  clientId: string,
  type: string,
  message: string
): Promise<void> {
  try {
    await supabase.from("notifications").insert({
      client_id: clientId,
      type: type,
      message: message,
      status: "sent",
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const startOfTomorrow = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
    const endOfTomorrow = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate() + 1);

    let messagesSent = 0;
    const errors: string[] = [];

    // 1. Check subscriptions with next_payment tomorrow
    console.log("Checking subscriptions due tomorrow...");
    const { data: subscriptions, error: subError } = await supabase
      .from("subscriptions")
      .select("id, plan_name, value, next_payment, client_id, clients(name, phone, email)")
      .eq("status", "active")
      .gte("next_payment", startOfTomorrow.toISOString())
      .lt("next_payment", endOfTomorrow.toISOString());

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      errors.push(`Erro ao buscar assinaturas: ${subError.message}`);
    } else if (subscriptions && subscriptions.length > 0) {
      console.log(`Found ${subscriptions.length} subscriptions due tomorrow`);
      
      for (const sub of subscriptions) {
        const client = sub.clients as any;
        if (client?.phone) {
          const message = `Olá ${client.name}! 👋\n\n` +
            `Lembramos que amanhã vence sua assinatura *${sub.plan_name}* no valor de *R$ ${sub.value.toFixed(2).replace(".", ",")}*.\n\n` +
            `Para evitar interrupção do serviço, realize o pagamento até a data de vencimento.\n\n` +
            `Qualquer dúvida, estamos à disposição! 🙌`;

          const sent = await sendWhatsAppMessage(client.phone, message);
          if (sent) {
            messagesSent++;
            await createNotification(
              supabase,
              sub.client_id,
              "payment_reminder",
              `Lembrete de assinatura enviado via WhatsApp: ${sub.plan_name}`
            );
          }
        } else {
          console.log(`Subscription ${sub.id}: Client has no phone number`);
        }
      }
    } else {
      console.log("No subscriptions due tomorrow");
    }

    // 2. Check pending payments (created more than 1 day ago)
    console.log("Checking pending payments...");
    const oneDayAgo = new Date(now);
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: pendingPayments, error: payError } = await supabase
      .from("payments")
      .select("id, amount, description, created_at, client_id, status, clients(name, phone, email)")
      .eq("status", "pending")
      .lt("created_at", oneDayAgo.toISOString());

    if (payError) {
      console.error("Error fetching pending payments:", payError);
      errors.push(`Erro ao buscar pagamentos pendentes: ${payError.message}`);
    } else if (pendingPayments && pendingPayments.length > 0) {
      console.log(`Found ${pendingPayments.length} pending payments`);
      
      // Check which payments already had notifications sent in the last 24 hours
      const paymentClientIds = pendingPayments.map((p: any) => p.client_id);
      const last24Hours = new Date(now);
      last24Hours.setHours(last24Hours.getHours() - 24);

      const { data: recentNotifications } = await supabase
        .from("notifications")
        .select("client_id, message")
        .in("client_id", paymentClientIds)
        .eq("type", "payment_reminder")
        .gte("sent_at", last24Hours.toISOString());

      const notifiedClientIds = new Set(recentNotifications?.map((n: any) => n.client_id) || []);

      for (const payment of pendingPayments) {
        // Skip if notification was already sent in the last 24 hours
        if (notifiedClientIds.has(payment.client_id)) {
          console.log(`Payment ${payment.id}: Notification already sent recently`);
          continue;
        }

        const client = payment.clients as any;
        if (client?.phone) {
          const daysAgo = Math.floor((now.getTime() - new Date(payment.created_at).getTime()) / (1000 * 60 * 60 * 24));
          
          const message = `Olá ${client.name}! 👋\n\n` +
            `Identificamos que você possui um pagamento pendente de *R$ ${payment.amount.toFixed(2).replace(".", ",")}*` +
            (payment.description ? ` referente a *${payment.description}*` : "") +
            ` há ${daysAgo} dia${daysAgo > 1 ? "s" : ""}.\n\n` +
            `Por favor, regularize seu pagamento para manter seu acesso ativo.\n\n` +
            `Qualquer dúvida, estamos à disposição! 🙌`;

          const sent = await sendWhatsAppMessage(client.phone, message);
          if (sent) {
            messagesSent++;
            await createNotification(
              supabase,
              payment.client_id,
              "payment_reminder",
              `Lembrete de pagamento pendente enviado via WhatsApp: R$ ${payment.amount.toFixed(2)}`
            );
          }
        } else {
          console.log(`Payment ${payment.id}: Client has no phone number`);
        }
      }
    } else {
      console.log("No pending payments found");
    }

    // 3. Check overdue payments
    console.log("Checking overdue payments...");
    const { data: overduePayments, error: overdueError } = await supabase
      .from("payments")
      .select("id, amount, description, created_at, client_id, status, clients(name, phone, email)")
      .eq("status", "overdue");

    if (overdueError) {
      console.error("Error fetching overdue payments:", overdueError);
      errors.push(`Erro ao buscar pagamentos em atraso: ${overdueError.message}`);
    } else if (overduePayments && overduePayments.length > 0) {
      console.log(`Found ${overduePayments.length} overdue payments`);

      // Check which clients already had overdue notifications in the last week
      const overdueClientIds = overduePayments.map((p: any) => p.client_id);
      const lastWeek = new Date(now);
      lastWeek.setDate(lastWeek.getDate() - 7);

      const { data: recentOverdueNotifications } = await supabase
        .from("notifications")
        .select("client_id")
        .in("client_id", overdueClientIds)
        .eq("type", "payment_overdue")
        .gte("sent_at", lastWeek.toISOString());

      const notifiedOverdueClientIds = new Set(recentOverdueNotifications?.map((n: any) => n.client_id) || []);

      for (const payment of overduePayments) {
        if (notifiedOverdueClientIds.has(payment.client_id)) {
          console.log(`Payment ${payment.id}: Overdue notification already sent this week`);
          continue;
        }

        const client = payment.clients as any;
        if (client?.phone) {
          const message = `Olá ${client.name}! ⚠️\n\n` +
            `Seu pagamento de *R$ ${payment.amount.toFixed(2).replace(".", ",")}*` +
            (payment.description ? ` referente a *${payment.description}*` : "") +
            ` encontra-se em atraso.\n\n` +
            `Para evitar a suspensão dos serviços, por favor regularize sua situação o mais breve possível.\n\n` +
            `Entre em contato conosco para mais informações. 📞`;

          const sent = await sendWhatsAppMessage(client.phone, message);
          if (sent) {
            messagesSent++;
            await createNotification(
              supabase,
              payment.client_id,
              "payment_overdue",
              `Notificação de pagamento em atraso enviado via WhatsApp: R$ ${payment.amount.toFixed(2)}`
            );
          }
        }
      }
    } else {
      console.log("No overdue payments found");
    }

    console.log(`Total messages sent: ${messagesSent}`);

    return new Response(
      JSON.stringify({
        success: true,
        messagesSent,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in whatsapp-reminders function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
