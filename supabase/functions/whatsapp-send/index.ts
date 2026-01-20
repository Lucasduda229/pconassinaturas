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

    console.log(`Sending WhatsApp message to ${phone}`);

    // Send message via BTZap API - using correct endpoint format
    const url = `https://adm.btzap.com.br/api/send_message?access_token=${apiKey}&instance_id=${instanceId}&number=${encodeURIComponent(phone)}&message=${encodeURIComponent(message)}`;
    
    console.log(`BTZap API URL: https://adm.btzap.com.br/api/send_message?instance_id=${instanceId}&number=${phone}`);
    
    const response = await fetch(url, {
      method: "POST",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`BTZap API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao enviar mensagem via BTZap" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const result = await response.json();
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
