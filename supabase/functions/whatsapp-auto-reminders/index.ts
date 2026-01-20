import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Default promo image URL
const PROMO_IMAGE_URL = "https://pconassinaturas.lovable.app/images/whatsapp-promo.png";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("BTZAP_API_KEY");
    const instanceId = Deno.env.get("BTZAP_INSTANCE_ID");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!apiKey || !instanceId) {
      console.error("BTZap not configured");
      return new Response(
        JSON.stringify({ success: false, error: "BTZap não configurado" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    // Get today for overdue check
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    console.log(`Checking subscriptions for reminders. Tomorrow: ${tomorrowStr}, Today: ${todayStr}`);

    // Get subscriptions due tomorrow (D-1 reminder)
    const { data: dueTomorrow, error: dueError } = await supabase
      .from("subscriptions")
      .select(`
        id,
        plan_name,
        value,
        next_payment,
        client:clients(id, name, phone, email)
      `)
      .eq("status", "active")
      .gte("next_payment", tomorrowStr)
      .lt("next_payment", new Date(tomorrow.getTime() + 86400000).toISOString().split("T")[0]);

    if (dueError) {
      console.error("Error fetching due subscriptions:", dueError);
    }

    // Get overdue subscriptions
    const { data: overdue, error: overdueError } = await supabase
      .from("subscriptions")
      .select(`
        id,
        plan_name,
        value,
        next_payment,
        client:clients(id, name, phone, email)
      `)
      .eq("status", "active")
      .lt("next_payment", todayStr);

    if (overdueError) {
      console.error("Error fetching overdue subscriptions:", overdueError);
    }

    const results = {
      reminders_sent: 0,
      overdue_sent: 0,
      errors: [] as string[],
    };

    // Helper function to send message with image
    const sendMessageWithImage = async (phone: string, message: string) => {
      const response = await fetch("https://adm.btzap.com.br/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: phone,
          type: "image",
          message: message,
          media_url: PROMO_IMAGE_URL,
          instance_id: instanceId,
          access_token: apiKey,
        }),
      });
      return response.json();
    };

    // Send D-1 reminders
    if (dueTomorrow && dueTomorrow.length > 0) {
      for (const sub of dueTomorrow) {
        const client = sub.client as any;
        if (!client?.phone) {
          console.log(`Skipping ${client?.name}: no phone`);
          continue;
        }

        const message = `Ola ${client.name}! 💈\n\nPassando para lembrar que a fatura referente a sua assinatura ativa do *${sub.plan_name}* no valor de *R$ ${sub.value.toFixed(2).replace(".", ",")}* vence amanha.\n\nVoce pode acessar os detalhes da sua assinatura no seu perfil de cliente.\n\nMantenha seu acesso ao sistema de agendamento da barbearia em dia!\n\nQualquer duvida, estamos a disposicao.`;

        try {
          let phone = client.phone.replace(/\D/g, "");
          if (!phone.startsWith("55")) phone = "55" + phone;

          const result = await sendMessageWithImage(phone, message);
          console.log(`D-1 reminder with image sent to ${client.name}:`, result.status);

          if (result.status === "success") {
            results.reminders_sent++;

            // Log to whatsapp_messages
            await supabase.from("whatsapp_messages").insert({
              client_id: client.id,
              phone: phone,
              message: message,
              message_type: "auto_reminder",
              btzap_message_id: result.message?.key?.id || null,
              remote_jid: result.message?.key?.remoteJid || null,
              status: "sent",
            });
          }
        } catch (err: any) {
          console.error(`Error sending to ${client.name}:`, err.message);
          results.errors.push(`${client.name}: ${err.message}`);
        }
      }
    }

    // Send overdue reminders
    if (overdue && overdue.length > 0) {
      for (const sub of overdue) {
        const client = sub.client as any;
        if (!client?.phone) continue;

        const daysOverdue = Math.floor(
          (today.getTime() - new Date(sub.next_payment).getTime()) / 86400000
        );

        const message = `Ola ${client.name}! 💈\n\n⚠️ A fatura referente a sua assinatura ativa do *${sub.plan_name}* no valor de *R$ ${sub.value.toFixed(2).replace(".", ",")}* esta em atraso ha ${daysOverdue} dia(s).\n\nRegularize o pagamento para manter sua assinatura em dia. Acesse seu perfil de cliente para mais informacoes.\n\nQualquer duvida, entre em contato conosco!`;

        try {
          let phone = client.phone.replace(/\D/g, "");
          if (!phone.startsWith("55")) phone = "55" + phone;

          const result = await sendMessageWithImage(phone, message);
          console.log(`Overdue reminder with image sent to ${client.name}:`, result.status);

          if (result.status === "success") {
            results.overdue_sent++;

            await supabase.from("whatsapp_messages").insert({
              client_id: client.id,
              phone: phone,
              message: message,
              message_type: "auto_overdue",
              btzap_message_id: result.message?.key?.id || null,
              remote_jid: result.message?.key?.remoteJid || null,
              status: "sent",
            });
          }
        } catch (err: any) {
          console.error(`Error sending overdue to ${client.name}:`, err.message);
          results.errors.push(`${client.name}: ${err.message}`);
        }
      }
    }

    console.log("Auto reminders completed:", results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in auto reminders:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
