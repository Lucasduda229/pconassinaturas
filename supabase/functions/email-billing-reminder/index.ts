import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOGO_URL = "https://lcnaptefceboratxhzox.supabase.co/storage/v1/object/public/contracts/whatsapp/promo-pcon.jpg";
const CLIENT_AREA_URL = "https://www.assinaturaspcon.sbs/cliente";

const generateEmailHTML = (
  clientName: string,
  planName: string,
  amount: string,
  dueDate: string,
) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cobrança - P-CON CONSTRUNET</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header com logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #0d1b3e 0%, #1E4FA3 100%);padding:32px 40px;text-align:center;">
              <img src="https://lcnaptefceboratxhzox.supabase.co/storage/v1/object/public/contracts/assets%2Flogo-pcon-white.png" alt="P-CON CONSTRUNET" width="180" style="display:block;margin:0 auto;" />
            </td>
          </tr>

          <!-- Badge de Cobrança -->
          <tr>
            <td style="padding:24px 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#FEF3C7;border-left:4px solid #F59E0B;padding:12px 16px;border-radius:6px;">
                    <p style="margin:0;font-size:14px;color:#92400E;font-weight:600;">
                      ⚠️ Fatura vencida — regularize para manter sua assinatura ativa
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Corpo do email -->
          <tr>
            <td style="padding:28px 40px;">
              <p style="font-size:16px;color:#1a1a2e;margin:0 0 16px;">
                Olá <strong>${clientName}</strong>,
              </p>
              <p style="font-size:15px;color:#4a4a5a;line-height:1.6;margin:0 0 24px;">
                Identificamos que a fatura referente à sua assinatura está <strong style="color:#DC2626;">vencida</strong>. Confira os detalhes abaixo e regularize o pagamento para evitar a suspensão dos serviços.
              </p>

              <!-- Detalhes da fatura -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                          <span style="font-size:13px;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;">Plano</span>
                        </td>
                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;">
                          <span style="font-size:15px;color:#1a1a2e;font-weight:600;">${planName}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                          <span style="font-size:13px;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;">Valor</span>
                        </td>
                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;">
                          <span style="font-size:17px;color:#1E4FA3;font-weight:700;">${amount}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <span style="font-size:13px;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;">Vencimento</span>
                        </td>
                        <td style="padding:8px 0;text-align:right;">
                          <span style="font-size:15px;color:#DC2626;font-weight:600;">${dueDate}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Botão CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${CLIENT_AREA_URL}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#1E4FA3 0%,#2A3F86 100%);color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:8px;letter-spacing:0.3px;">
                      Acessar Área do Cliente
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size:13px;color:#94a3b8;text-align:center;margin:16px 0 0;">
                Caso já tenha efetuado o pagamento, desconsidere este e-mail.
              </p>
            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td style="background-color:#0d1b3e;padding:28px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:12px;">
                    <p style="margin:0;font-size:15px;color:#ffffff;font-weight:600;">P-CON CONSTRUNET</p>
                    <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;">Criação de Sistemas</p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:8px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:0 8px;">
                          <a href="https://wa.me/5511999999999" style="font-size:13px;color:#60a5fa;text-decoration:none;">📱 WhatsApp</a>
                        </td>
                        <td style="color:#475569;">|</td>
                        <td style="padding:0 8px;">
                          <a href="mailto:contato@assinaturaspcon.sbs" style="font-size:13px;color:#60a5fa;text-decoration:none;">✉️ contato@assinaturaspcon.sbs</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:12px;border-top:1px solid #1e3a5f;">
                    <p style="margin:0;font-size:11px;color:#64748b;">
                      © ${new Date().getFullYear()} P-CON CONSTRUNET. Todos os direitos reservados.
                    </p>
                    <p style="margin:4px 0 0;font-size:11px;color:#64748b;">
                      <a href="${CLIENT_AREA_URL}" style="color:#60a5fa;text-decoration:none;">Área do Cliente</a> · 
                      <a href="https://www.assinaturaspcon.sbs" style="color:#60a5fa;text-decoration:none;">Site</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Resend API key não configurada" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Compute yesterday in BRT (D+1 = payment due yesterday = overdue by 1 day)
    const toYMDInSaoPaulo = (d: Date) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);

    const now = new Date();
    const todayBrt = toYMDInSaoPaulo(now);
    
    // Yesterday = due date that is now D+1
    const yesterday = new Date(new Date(`${todayBrt}T12:00:00-03:00`).getTime() - 86400000);
    const yesterdayStr = toYMDInSaoPaulo(yesterday);

    const startOfYesterdayUtc = new Date(`${yesterdayStr}T00:00:00-03:00`).toISOString();
    const endOfYesterdayUtc = new Date(`${yesterdayStr}T23:59:59-03:00`).toISOString();

    console.log(`Checking payments due yesterday (D+1 overdue) in BRT: ${yesterdayStr}`);

    const { data: overduePayments, error: queryError } = await supabase
      .from("payments")
      .select(`
        id, amount, due_date, status, description, subscription_id,
        client:clients(id, name, phone, email),
        subscription:subscriptions(plan_name)
      `)
      .eq("status", "pending")
      .gte("due_date", startOfYesterdayUtc)
      .lte("due_date", endOfYesterdayUtc);

    if (queryError) {
      console.error("Error fetching overdue payments:", queryError);
      return new Response(
        JSON.stringify({ success: false, error: queryError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${overduePayments?.length || 0} overdue payments (D+1)`);

    const results = {
      emails_sent: 0,
      skipped_no_email: 0,
      errors: [] as string[],
    };

    if (overduePayments && overduePayments.length > 0) {
      for (const payment of overduePayments) {
        const client = payment.client as any;

        if (!client?.email) {
          results.skipped_no_email++;
          console.log(`Skipped payment ${payment.id} - no client email`);
          continue;
        }

        const planName = (payment.subscription as any)?.plan_name ||
          payment.description?.replace("Cobrança - ", "") ||
          "Assinatura";

        const formattedAmount = `R$ ${payment.amount.toFixed(2).replace(".", ",")}`;

        // Format due date
        const dueDate = new Date(payment.due_date!);
        const formattedDueDate = dueDate.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          timeZone: "America/Sao_Paulo",
        });

        const emailHTML = generateEmailHTML(
          client.name,
          planName,
          formattedAmount,
          formattedDueDate,
        );

        try {
          console.log(`Sending billing email to ${client.name} (${client.email})`);

          const resendResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: "P-CON CONSTRUNET <cobranca@assinaturaspcon.sbs>",
              to: [client.email],
              subject: `⚠️ Fatura vencida - ${planName} | P-CON CONSTRUNET`,
              html: emailHTML,
            }),
          });

          const resendResult = await resendResponse.json();

          if (resendResponse.ok) {
            results.emails_sent++;
            console.log(`Email sent to ${client.email}: ${resendResult.id}`);
          } else {
            console.error(`Resend error for ${client.email}:`, resendResult);
            results.errors.push(`${client.name}: ${resendResult.message || "Erro Resend"}`);
          }
        } catch (err: any) {
          console.error(`Error sending email to ${client.name}:`, err.message);
          results.errors.push(`${client.name}: ${err.message}`);
        }
      }
    }

    console.log("D+1 billing email results:", results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in email billing reminder:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
