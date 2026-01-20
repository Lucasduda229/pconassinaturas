import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("BTZAP_API_KEY");
    const instanceId = Deno.env.get("BTZAP_INSTANCE_ID");

    if (!apiKey || !instanceId) {
      return new Response(
        JSON.stringify({ success: false, error: "BTZap não configurado" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body = await req.json();
    const action = body.action || "status";

    // Get the webhook URL for this project
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const webhookUrl = `${supabaseUrl}/functions/v1/btzap-webhook`;

    if (action === "configure_webhook") {
      // Configure webhook in BTZap
      console.log(`Configuring webhook URL: ${webhookUrl}`);
      
      // Use POST with form-encoded params as per BTZap docs
      const params = new URLSearchParams({
        webhook_url: webhookUrl,
        enable: "true",
        instance_id: instanceId,
        access_token: apiKey,
      });

      const response = await fetch(
        `https://adm.btzap.com.br/api/set_webhook?${params.toString()}`,
        { method: "POST" }
      );

      const result = await response.text();
      console.log("BTZap set_webhook response:", result);

      let parsedResult;
      try {
        parsedResult = JSON.parse(result);
      } catch {
        parsedResult = { raw: result };
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: "configure_webhook",
          webhook_url: webhookUrl,
          btzap_response: parsedResult 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (action === "get_qrcode") {
      // Get QR code for connection
      console.log("Getting QR code...");
      
      const response = await fetch(
        `https://adm.btzap.com.br/api/get_qrcode?instance_id=${instanceId}&access_token=${apiKey}`,
        { method: "POST" }
      );

      const result = await response.text();
      console.log("BTZap get_qrcode response:", result);

      let parsedResult;
      try {
        parsedResult = JSON.parse(result);
      } catch {
        parsedResult = { raw: result };
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: "get_qrcode",
          btzap_response: parsedResult 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (action === "reconnect") {
      // Reconnect instance
      console.log("Reconnecting instance...");
      
      const response = await fetch(
        `https://adm.btzap.com.br/api/reconnect?instance_id=${instanceId}&access_token=${apiKey}`,
        { method: "POST" }
      );

      const result = await response.text();
      console.log("BTZap reconnect response:", result);

      let parsedResult;
      try {
        parsedResult = JSON.parse(result);
      } catch {
        parsedResult = { raw: result };
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: "reconnect",
          btzap_response: parsedResult 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (action === "test_send") {
      // Test sending a simple message
      const testPhone = body.phone;
      if (!testPhone) {
        return new Response(
          JSON.stringify({ success: false, error: "Phone number required for test" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      let formattedPhone = testPhone.replace(/\D/g, "");
      if (!formattedPhone.startsWith("55")) {
        formattedPhone = "55" + formattedPhone;
      }

      console.log(`Testing send to: ${formattedPhone}`);

      const response = await fetch("https://adm.btzap.com.br/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: formattedPhone,
          type: "text",
          message: "Teste de conexao BTZap - P-CON",
          instance_id: instanceId,
          access_token: apiKey,
        }),
      });

      const result = await response.text();
      console.log("BTZap test send response:", result);

      let parsedResult;
      try {
        parsedResult = JSON.parse(result);
      } catch {
        parsedResult = { raw: result };
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: "test_send",
          phone: formattedPhone,
          btzap_response: parsedResult 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Default: return current configuration
    return new Response(
      JSON.stringify({ 
        success: true,
        action: "status",
        instance_id: instanceId,
        webhook_url: webhookUrl,
        available_actions: ["configure_webhook", "get_qrcode", "reconnect", "test_send"]
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in btzap-setup:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
