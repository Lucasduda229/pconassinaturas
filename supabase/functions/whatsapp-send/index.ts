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

    console.log(`Sending WhatsApp message to ${formattedPhone}`);

    // Send message via BTZap API - correct endpoint: /api/send with JSON body
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

    let result;
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

    console.log("BTZap response:", result);

    // Create notification record
    if (clientId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

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
