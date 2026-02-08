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

// ATIVADO - Envia cobrança somente no dia do vencimento (D-0)
const AUTO_REMINDERS_ENABLED = true;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Check if auto reminders are enabled
  if (!AUTO_REMINDERS_ENABLED) {
    console.log("Auto reminders are temporarily disabled");
    return new Response(
      JSON.stringify({ success: true, message: "Auto reminders temporarily disabled", results: { due_today_sent: 0, errors: [] } }),
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
    const toYMDInSaoPaulo = (d: Date) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d); // YYYY-MM-DD

    const now = new Date();
    const todayBrt = toYMDInSaoPaulo(now);

    const startOfTodayUtc = new Date(`${todayBrt}T00:00:00-03:00`).toISOString();
    const startOfTomorrowUtc = new Date(
      new Date(`${todayBrt}T00:00:00-03:00`).getTime() + 86400000
    ).toISOString();

    console.log(`Checking payments due TODAY (D-0) in BRT: ${todayBrt}`);
    console.log(`Range: ${startOfTodayUtc} to ${startOfTomorrowUtc}`);

    // Get PENDING payments due TODAY (D-0) - only pending, not paid
    const { data: dueTodayPayments, error: dueError } = await supabase
      .from("payments")
      .select(`
        id,
        amount,
        due_date,
        status,
        description,
        subscription_id,
        client:clients(id, name, phone, email),
        subscription:subscriptions(plan_name)
      `)
      .eq("status", "pending")
      .gte("due_date", startOfTodayUtc)
      .lt("due_date", startOfTomorrowUtc);

    if (dueError) {
      console.error("Error fetching due payments:", dueError);
    }

    console.log(`Found ${dueTodayPayments?.length || 0} pending payments due today`);

    const results = {
      due_today_sent: 0,
      skipped_no_phone: 0,
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
      }

      return { ...mediaResult, httpStatus: mediaResponse.status };
    };

    // Send D-0 reminders (day of billing) - ONLY for pending payments
    if (dueTodayPayments && dueTodayPayments.length > 0) {
      for (const payment of dueTodayPayments) {
        const client = payment.client as any;
        
        if (!client?.phone) {
          console.log(`Skipping payment ${payment.id}: client has no phone`);
          results.skipped_no_phone++;
          continue;
        }

        // Get plan name from subscription or description
        const planName = (payment.subscription as any)?.plan_name || 
                        payment.description?.replace("Cobrança - ", "") || 
                        "Assinatura";

        const formattedValue = `R$ ${payment.amount.toFixed(2).replace(".", ",")}`;

        const message = `Ola ${client.name}! 💈\n\n` +
          `💰 *Lembrete de cobrança*\n\n` +
          `A fatura referente ao seu plano *${planName}* no valor de *${formattedValue}* vence *hoje*.\n\n` +
          `Efetue o pagamento para manter sua assinatura ativa!\n\n` +
          `Qualquer duvida, estamos a disposicao.`;

        try {
          let phone = client.phone.replace(/\D/g, "");
          if (!phone.startsWith("55")) phone = "55" + phone;

          console.log(`Sending D-0 reminder to ${client.name} (${phone}) for payment ${payment.id}`);
          
          const result = await sendMessageWithImageAndButton(phone, message);
          console.log(`D-0 reminder sent to ${client.name}:`, result.httpStatus);

          const isSuccess = result.httpStatus === 200 && (result.key || result.chatid || result.messageid);
          
          if (isSuccess) {
            results.due_today_sent++;

            // Log to whatsapp_messages
            await supabase.from("whatsapp_messages").insert({
              client_id: client.id,
              phone: phone,
              message: message,
              message_type: "auto_due_today",
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

    console.log("Auto reminders D-0 completed:", results);

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
