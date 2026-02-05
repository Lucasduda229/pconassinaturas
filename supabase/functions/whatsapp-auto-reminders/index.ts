import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Client area URL
const CLIENT_AREA_URL = "https://www.assinaturaspcon.sbs/cliente";

// UAZAPI base URL (token identifies the instance via header)
const UAZAPI_BASE_URL = "https://btzap.uazapi.com";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiToken = Deno.env.get("BTZAP_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!apiToken) {
      console.error("UAZAPI not configured");
      return new Response(
        JSON.stringify({ success: false, error: "UAZAPI não configurado" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Compute date boundaries in America/Sao_Paulo (BRT, UTC-03)
    // This prevents timezone mismatches when next_payment is stored as timestamptz.
    const toYMDInSaoPaulo = (d: Date) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d); // YYYY-MM-DD

    const now = new Date();
    const todayBrt = toYMDInSaoPaulo(now);
    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowBrt = toYMDInSaoPaulo(tomorrowDate);

    const startOfTomorrowUtc = new Date(`${tomorrowBrt}T00:00:00-03:00`).toISOString();
    const startOfDayAfterTomorrowUtc = new Date(
      new Date(`${tomorrowBrt}T00:00:00-03:00`).getTime() + 86400000
    ).toISOString();

    const startOfTodayUtc = new Date(`${todayBrt}T00:00:00-03:00`).toISOString();

    console.log(
      `Checking subscriptions for reminders (BRT). Today: ${todayBrt}, Tomorrow: ${tomorrowBrt}`
    );

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
      .gte("next_payment", startOfTomorrowUtc)
      .lt("next_payment", startOfDayAfterTomorrowUtc);

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
      .lt("next_payment", startOfTodayUtc);

    if (overdueError) {
      console.error("Error fetching overdue subscriptions:", overdueError);
    }

    const results = {
      reminders_sent: 0,
      overdue_sent: 0,
      errors: [] as string[],
    };

    // UAZAPI auth header
    const uazapiAuthHeaders = {
      token: apiToken,
    };

     // Helper function to send text message using UAZAPI
     const sendTextMessage = async (phone: string, message: string) => {
       const response = await fetch(`${UAZAPI_BASE_URL}/send/text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...uazapiAuthHeaders,
        },
        body: JSON.stringify({
          number: phone,
           text: message,
        }),
      });

      const responseText = await response.text();
      console.log(`UAZAPI response for ${phone}:`, responseText);
      
      try {
        return { ...JSON.parse(responseText), httpStatus: response.status };
      } catch {
        return { raw: responseText, httpStatus: response.status };
      }
    };

    // Send D-1 reminders
    if (dueTomorrow && dueTomorrow.length > 0) {
      for (const sub of dueTomorrow) {
        const client = sub.client as any;
        if (!client?.phone) {
          console.log(`Skipping ${client?.name}: no phone`);
          continue;
        }

        const message = `Ola ${client.name}! 💈\n\nPassando para lembrar que a fatura referente a sua assinatura ativa do *${sub.plan_name}* no valor de *R$ ${sub.value.toFixed(2).replace(".", ",")}* vence amanha.\n\n📱 *Acesse sua area do cliente:*\n${CLIENT_AREA_URL}\n\nQualquer duvida, estamos a disposicao.`;

        try {
          let phone = client.phone.replace(/\D/g, "");
          if (!phone.startsWith("55")) phone = "55" + phone;

           const result = await sendTextMessage(phone, message);
           console.log(`D-1 reminder sent to ${client.name}:`, result.httpStatus);

           const isSuccess = result.httpStatus === 200 && (result.status === "success" || result.key || result.chatid);
          
          if (isSuccess) {
            results.reminders_sent++;

            // Log to whatsapp_messages
            await supabase.from("whatsapp_messages").insert({
              client_id: client.id,
              phone: phone,
              message: message,
              message_type: "auto_reminder",
              btzap_message_id: result.key?.id || result.messageId || null,
              remote_jid: result.key?.remoteJid || null,
              status: "sent",
            });
          } else {
            results.errors.push(`${client.name}: HTTP ${result.httpStatus}`);
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
          (Date.now() - new Date(sub.next_payment).getTime()) / 86400000
        );

        const message = `Ola ${client.name}! 💈\n\n⚠️ A fatura referente a sua assinatura ativa do *${sub.plan_name}* no valor de *R$ ${sub.value.toFixed(2).replace(".", ",")}* esta em atraso ha ${daysOverdue} dia(s).\n\nRegularize o pagamento para manter sua assinatura em dia.\n\n📱 *Acesse sua area do cliente:*\n${CLIENT_AREA_URL}\n\nQualquer duvida, entre em contato conosco!`;

        try {
          let phone = client.phone.replace(/\D/g, "");
          if (!phone.startsWith("55")) phone = "55" + phone;

           const result = await sendTextMessage(phone, message);
           console.log(`Overdue reminder sent to ${client.name}:`, result.httpStatus);

           const isSuccess = result.httpStatus === 200 && (result.status === "success" || result.key || result.chatid);
          
          if (isSuccess) {
            results.overdue_sent++;

            await supabase.from("whatsapp_messages").insert({
              client_id: client.id,
              phone: phone,
              message: message,
              message_type: "auto_overdue",
              btzap_message_id: result.key?.id || result.messageId || null,
              remote_jid: result.key?.remoteJid || null,
              status: "sent",
            });
          } else {
            results.errors.push(`${client.name}: HTTP ${result.httpStatus}`);
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
