import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const body = req.method === 'POST' ? await req.json() : {};

    console.log('Affiliate Auth Action:', action);

    switch (action) {
      case 'register': {
        const { name, email, phone, pix_key, password } = body;
        
        if (!name || !email || !password) {
          return new Response(
            JSON.stringify({ error: 'Nome, email e senha são obrigatórios' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if affiliate already exists
        const { data: existingAffiliate } = await supabase
          .from('affiliates')
          .select('id')
          .eq('email', email.toLowerCase())
          .maybeSingle();

        if (existingAffiliate) {
          return new Response(
            JSON.stringify({ error: 'Email já cadastrado' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create affiliate (status = pending for approval)
        const { data: newAffiliate, error: affiliateError } = await supabase
          .from('affiliates')
          .insert({
            name,
            email: email.toLowerCase(),
            phone: phone || null,
            pix_key: pix_key || null,
            status: 'pending'
          })
          .select()
          .single();

        if (affiliateError) {
          console.error('Affiliate creation error:', affiliateError);
          return new Response(
            JSON.stringify({ error: 'Erro ao criar cadastro' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create affiliate user credentials
        const passwordHash = await hashPassword(password);
        
        const { error: userError } = await supabase
          .from('affiliate_users')
          .insert({
            affiliate_id: newAffiliate.id,
            email: email.toLowerCase(),
            password_hash: passwordHash
          });

        if (userError) {
          console.error('Affiliate user creation error:', userError);
          // Rollback affiliate creation
          await supabase.from('affiliates').delete().eq('id', newAffiliate.id);
          return new Response(
            JSON.stringify({ error: 'Erro ao criar credenciais' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Affiliate registered:', email);
        return new Response(
          JSON.stringify({ success: true, message: 'Cadastro realizado! Aguarde aprovação.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'login': {
        const { email, password } = body;
        
        if (!email || !password) {
          return new Response(
            JSON.stringify({ error: 'Email e senha são obrigatórios' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const passwordHash = await hashPassword(password);
        
        const { data: affiliateUser, error } = await supabase
          .from('affiliate_users')
          .select('*, affiliates(*)')
          .eq('email', email.toLowerCase())
          .eq('password_hash', passwordHash)
          .maybeSingle();

        if (error || !affiliateUser) {
          console.log('Affiliate login failed:', email);
          return new Response(
            JSON.stringify({ error: 'Email ou senha incorretos' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if affiliate is approved
        if (affiliateUser.affiliates.status === 'pending') {
          return new Response(
            JSON.stringify({ error: 'Seu cadastro ainda está em análise. Aguarde aprovação.' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (affiliateUser.affiliates.status === 'rejected') {
          return new Response(
            JSON.stringify({ error: 'Seu cadastro foi recusado.' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (affiliateUser.affiliates.status === 'inactive') {
          return new Response(
            JSON.stringify({ error: 'Sua conta está inativa.' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Generate session token
        const token = generateToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

        const { error: sessionError } = await supabase
          .from('affiliate_sessions')
          .insert({
            affiliate_user_id: affiliateUser.id,
            token,
            expires_at: expiresAt.toISOString()
          });

        if (sessionError) {
          console.error('Affiliate session creation error:', sessionError);
          return new Response(
            JSON.stringify({ error: 'Erro ao criar sessão' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update last login
        await supabase
          .from('affiliate_users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', affiliateUser.id);

        console.log('Affiliate login successful:', email);
        return new Response(
          JSON.stringify({ 
            token, 
            affiliate: affiliateUser.affiliates,
            expiresAt: expiresAt.toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'verify': {
        const { token } = body;
        
        if (!token) {
          return new Response(
            JSON.stringify({ error: 'Token não fornecido' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: session, error } = await supabase
          .from('affiliate_sessions')
          .select('*, affiliate_users(*, affiliates(*))')
          .eq('token', token)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (error || !session) {
          return new Response(
            JSON.stringify({ error: 'Sessão inválida ou expirada' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ 
            affiliate: session.affiliate_users.affiliates,
            affiliateUser: {
              id: session.affiliate_users.id,
              email: session.affiliate_users.email
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'logout': {
        const { token } = body;
        
        if (token) {
          await supabase
            .from('affiliate_sessions')
            .delete()
            .eq('token', token);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Ação desconhecida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Affiliate Auth Error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
