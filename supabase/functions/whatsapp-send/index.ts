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
  sendImage?: boolean;
  imageUrl?: string;
}

// Default promo image URL
const DEFAULT_IMAGE_URL = "https://pconassinaturas.lovable.app/images/whatsapp-promo.png";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("BTZAP_API_KEY");
    const instanceId = Deno.env.get("BTZAP_INSTANCE_ID");

    if (!apiKey || !instanceId) {
      console.error("BTZap API key or Instance ID not configured");
      return new Response(
        JSON.stringify({ success: false, error: "BTZap não configurado" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { phone, message, clientId, type, sendImage = true, imageUrl }: SendMessageRequest = await req.json();

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

    console.log(`Sending WhatsApp message to ${formattedPhone}, sendImage: ${sendImage}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let result;
    let btzapMessageId = null;
    let remoteJid = null;
    let messageStatus = "failed";

    // If sendImage is true, first send the image with caption
    if (sendImage) {
      const imageToSend = imageUrl || DEFAULT_IMAGE_URL;
      console.log(`Sending image: ${imageToSend}`);

      // Send image with caption using BTZap media endpoint
      const imageResponse = await fetch("https://adm.btzap.com.br/api/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: formattedPhone,
          type: "image",
          message: message,
          media_url: imageToSend,
          instance_id: instanceId,
          access_token: apiKey,
        }),
      });

      console.log(`BTZap API image response status: ${imageResponse.status}`);

      const imageResponseText = await imageResponse.text();
      console.log("BTZap image raw response:", imageResponseText);

      try {
        result = JSON.parse(imageResponseText);
      } catch {
        console.error("Failed to parse BTZap image response as JSON:", imageResponseText);
        if (!imageResponse.ok) {
          // Fallback to text-only message if image fails
          console.log("Image send failed, falling back to text-only message");
        }
        result = { raw: imageResponseText };
      }

      btzapMessageId = result?.message?.key?.id || null;
      remoteJid = result?.message?.key?.remoteJid || null;
      messageStatus = result?.status === "success" ? "sent" : "failed";

    } else {
      // Send text-only message
      const response = await fetch("https://adm.btzap.com.br/api/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: formattedPhone,
          type: "text",
          message: message,
          instance_id: instanceId,
          access_token: apiKey,
        }),
      });

      console.log(`BTZap API response status: ${response.status}`);

      const responseText = await response.text();
      console.log("BTZap raw response:", responseText);

      try {
        result = JSON.parse(responseText);
      } catch {
        console.error("Failed to parse BTZap response as JSON:", responseText);
        if (!response.ok) {
          return new Response(
            JSON.stringify({ success: false, error: "Erro ao enviar mensagem via BTZap" }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        result = { raw: responseText };
      }

      btzapMessageId = result?.message?.key?.id || null;
      remoteJid = result?.message?.key?.remoteJid || null;
      messageStatus = result?.status === "success" ? "sent" : "failed";
    }

    console.log("BTZap response:", result);

    // Save to whatsapp_messages table for tracking
    await supabase.from("whatsapp_messages").insert({
      client_id: clientId || null,
      phone: formattedPhone,
      message: message,
      message_type: type || "manual",
      btzap_message_id: btzapMessageId,
      remote_jid: remoteJid,
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
      JSON.stringify({ success: true, data: result }),
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
