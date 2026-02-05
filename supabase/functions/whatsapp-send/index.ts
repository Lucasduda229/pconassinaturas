import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendMessageRequest {
  phone: string;
  message: string;
  clientId: string;
  type: string;
}

// UAZAPI base URL (token identifies the instance via header)
const UAZAPI_BASE_URL = "https://btzap.uazapi.com";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiToken = Deno.env.get("BTZAP_API_KEY");

    if (!apiToken) {
      console.error("UAZAPI token not configured");
      return new Response(
        JSON.stringify({ success: false, error: "UAZAPI não configurado" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

     const { phone, message, clientId, type }: SendMessageRequest = await req.json();

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ success: false, error: "Telefone e mensagem são obrigatórios" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Format phone number (remove non-digits and ensure country code)
    let formattedPhone = phone.replace(/\D/g, "");
    if (!formattedPhone.startsWith("55")) {
      formattedPhone = "55" + formattedPhone;
    }

     console.log(`Sending WhatsApp text message to ${formattedPhone}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let result;
    let messageId = null;
    let messageStatus = "failed";

    // UAZAPI auth header
    const uazapiAuthHeaders = {
      token: apiToken,
    };

     // Send text-only message using UAZAPI /send/text endpoint
     const response = await fetch(`${UAZAPI_BASE_URL}/send/text`, {
       method: "POST",
       headers: {
         "Content-Type": "application/json",
         ...uazapiAuthHeaders,
       },
       body: JSON.stringify({
         number: formattedPhone,
         text: message,
       }),
     });

     console.log(`UAZAPI text response status: ${response.status}`);

     const responseText = await response.text();
     console.log("UAZAPI text raw response:", responseText);

     try {
       result = JSON.parse(responseText);
     } catch {
       console.error("Failed to parse UAZAPI response as JSON:", responseText);
       if (!response.ok) {
         return new Response(
           JSON.stringify({ success: false, error: "Erro ao enviar mensagem via UAZAPI" }),
           { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
         );
      }
       result = { raw: responseText };
    }

     messageId = result?.key?.id || result?.messageId || null;
     messageStatus = response.ok && (result?.status === "success" || result?.key) ? "sent" : "failed";

    console.log("UAZAPI response:", result);

    // Save to whatsapp_messages table for tracking
    await supabase.from("whatsapp_messages").insert({
      client_id: clientId || null,
      phone: formattedPhone,
      message: message,
      message_type: type || "manual",
      btzap_message_id: messageId,
      remote_jid: result?.key?.remoteJid || null,
      status: messageStatus,
    });

    // Create notification record
    if (clientId) {
      await supabase.from("notifications").insert({
        client_id: clientId,
        type: type === "overdue" ? "payment_overdue" : "payment_reminder",
        message: `Lembrete manual enviado via WhatsApp`,
        status: "sent",
      });
    }

    return new Response(
      JSON.stringify({ success: messageStatus === "sent", data: result }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in whatsapp-send function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
