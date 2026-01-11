import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ApprovalEmailRequest {
  affiliateId: string;
  affiliateName: string;
  affiliateEmail: string;
  loginUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { affiliateId, affiliateName, affiliateEmail, loginUrl }: ApprovalEmailRequest = await req.json();

    console.log("Sending approval email to:", affiliateEmail);

    // Get the affiliate's link
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: affiliateLink } = await supabase
      .from('affiliate_links')
      .select('slug')
      .eq('affiliate_id', affiliateId)
      .maybeSingle();

    const affiliateLinkUrl = affiliateLink 
      ? `${loginUrl.replace('/afiliados/login', '')}/r/${affiliateLink.slug}`
      : 'Será gerado após o primeiro login';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
              🎉 Parabéns, ${affiliateName}!
            </h1>
            <p style="color: rgba(255,255,255,0.9); margin-top: 10px; font-size: 16px;">
              Seu cadastro no Programa de Afiliados foi aprovado!
            </p>
          </div>
          
          <div style="background-color: #ffffff; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 20px;">
              Suas Credenciais de Acesso
            </h2>
            
            <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #3b82f6;">
              <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">
                <strong>Email:</strong>
              </p>
              <p style="margin: 0 0 15px 0; color: #1e293b; font-size: 16px; font-weight: 600;">
                ${affiliateEmail}
              </p>
              <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">
                <strong>Senha:</strong>
              </p>
              <p style="margin: 0; color: #1e293b; font-size: 16px;">
                A mesma senha que você cadastrou
              </p>
            </div>

            ${affiliateLink ? `
            <div style="background-color: #f0fdf4; border-radius: 12px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #22c55e;">
              <p style="margin: 0 0 10px 0; color: #15803d; font-size: 14px; font-weight: 600;">
                🔗 Seu Link de Indicação:
              </p>
              <p style="margin: 0; color: #166534; font-size: 14px; word-break: break-all;">
                ${affiliateLinkUrl}
              </p>
            </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Acessar Meu Painel
              </a>
            </div>
            
            <div style="border-top: 1px solid #e2e8f0; padding-top: 25px; margin-top: 25px;">
              <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 16px;">
                🚀 Próximos Passos:
              </h3>
              <ol style="color: #64748b; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Acesse seu painel de afiliado</li>
                <li>Copie seu link de indicação exclusivo</li>
                <li>Compartilhe com seus contatos</li>
                <li>Acompanhe seus leads e recompensas</li>
              </ol>
            </div>
            
            <p style="color: #94a3b8; font-size: 12px; margin-top: 30px; text-align: center;">
              Se você não solicitou este cadastro, por favor ignore este email.
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              © 2025 PCON - Todos os direitos reservados
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email using Resend API directly
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "PCON <onboarding@resend.dev>",
        to: [affiliateEmail],
        subject: "🎉 Seu cadastro foi aprovado! Bem-vindo ao Programa de Afiliados",
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailResult);
      throw new Error(emailResult.message || "Failed to send email");
    }

    console.log("Email sent successfully:", emailResult);

    return new Response(JSON.stringify(emailResult), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in affiliate-approval-email function:", error);
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
