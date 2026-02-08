import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

 // Default promo image URL - hosted on Supabase Storage
 const PROMO_IMAGE_URL = "https://lcnaptefceboratxhzox.supabase.co/storage/v1/object/public/contracts/whatsapp/promo-pcon.jpg";
 
// Client area URL
const CLIENT_AREA_URL = "https://www.assinaturaspcon.sbs/cliente";

// UAZAPI base URL (token identifies the instance via header)
const UAZAPI_BASE_URL = "https://btzap.uazapi.com";

// TEMPORARIAMENTE DESATIVADO - Altere para true para reativar
const AUTO_REMINDERS_ENABLED = false;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Check if auto reminders are enabled
  if (!AUTO_REMINDERS_ENABLED) {
    console.log("Auto reminders are temporarily disabled");
    return new Response(
      JSON.stringify({ success: true, message: "Auto reminders temporarily disabled", results: { reminders_sent: 0, overdue_sent: 0, errors: [] } }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
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

     // Helper function to send image with text, then button
     const sendMessageWithImageAndButton = async (phone: string, message: string) => {
       // Step 1: Send image with text caption
       const imageUrl = `${PROMO_IMAGE_URL}?v=${Date.now()}`;
       
       const mediaResponse = await fetch(`${UAZAPI_BASE_URL}/send/media`, {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
           ...uazapiAuthHeaders,
         },
         body: JSON.stringify({
           number: phone,
           type: "image",
           file: imageUrl,
           text: message,
         }),
       });

       const mediaResponseText = await mediaResponse.text();
       console.log(`UAZAPI /send/media response for ${phone}:`, mediaResponseText);
       
       let mediaResult;
       try {
         mediaResult = JSON.parse(mediaResponseText);
       } catch {
         mediaResult = { raw: mediaResponseText };
       }

       const imageSuccess = mediaResponse.status === 200 && (mediaResult.key || mediaResult.chatid || mediaResult.messageid);
       
       if (imageSuccess) {
         // Step 2: Send button after image
         const menuPayload = {
           number: phone,
           type: "button",
           text: "📱 Acesse sua área do cliente:",
           choices: ["Acessar Área do Cliente | " + CLIENT_AREA_URL],
         };

         console.log("Sending button after image");
         
         const menuResponse = await fetch(`${UAZAPI_BASE_URL}/send/menu`, {
           method: "POST",
           headers: {
             "Content-Type": "application/json",
             ...uazapiAuthHeaders,
           },
           body: JSON.stringify(menuPayload),
         });

         const menuResponseText = await menuResponse.text();
         console.log(`UAZAPI /send/menu response for ${phone}:`, menuResponseText);
         
         // Even if button fails, we consider success since image was sent
       }

       return { ...mediaResult, httpStatus: mediaResponse.status };
     };

    // Send D-1 reminders
    if (dueTomorrow && dueTomorrow.length > 0) {
      for (const sub of dueTomorrow) {
        const client = sub.client as any;
        if (!client?.phone) {
          console.log(`Skipping ${client?.name}: no phone`);
          continue;
        }

        const message = `Ola ${client.name}! 💈\n\nPassando para lembrar que a fatura referente a sua assinatura ativa do *${sub.plan_name}* no valor de *R$ ${sub.value.toFixed(2).replace(".", ",")}* vence amanha.\n\nQualquer duvida, estamos a disposicao.`;

        try {
          let phone = client.phone.replace(/\D/g, "");
          if (!phone.startsWith("55")) phone = "55" + phone;

           const result = await sendMessageWithImageAndButton(phone, message);
           console.log(`D-1 reminder with image sent to ${client.name}:`, result.httpStatus);

           const isSuccess = result.httpStatus === 200 && (result.key || result.chatid || result.messageid);
          
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

        const message = `Ola ${client.name}! 💈\n\n⚠️ A fatura referente a sua assinatura ativa do *${sub.plan_name}* no valor de *R$ ${sub.value.toFixed(2).replace(".", ",")}* esta em atraso ha ${daysOverdue} dia(s).\n\nRegularize o pagamento para manter sua assinatura em dia.\n\nQualquer duvida, entre em contato conosco!`;

        try {
          let phone = client.phone.replace(/\D/g, "");
          if (!phone.startsWith("55")) phone = "55" + phone;

           const result = await sendMessageWithImageAndButton(phone, message);
           console.log(`Overdue reminder with image sent to ${client.name}:`, result.httpStatus);

           const isSuccess = result.httpStatus === 200 && (result.key || result.chatid || result.messageid);
          
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
