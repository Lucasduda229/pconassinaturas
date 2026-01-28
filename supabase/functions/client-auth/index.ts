import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");
const ASAAS_BASE_URL = "https://api.asaas.com/v3";

// Helper function to sync customer to ASAAS
async function syncCustomerToAsaas(client: { id: string; name: string; email: string; phone?: string | null; document?: string | null }): Promise<{ success: boolean; asaasId?: string; error?: string }> {
  if (!ASAAS_API_KEY) {
    console.log('ASAAS_API_KEY not configured, skipping sync');
    return { success: false, error: 'ASAAS not configured' };
  }

  try {
    // First check if customer already exists by email
    const searchResponse = await fetch(
      `${ASAAS_BASE_URL}/customers?email=${encodeURIComponent(client.email)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_API_KEY,
        },
      }
    );

    const searchData = await searchResponse.json();
    
    if (searchData.data && searchData.data.length > 0) {
      console.log('Customer already exists in ASAAS:', searchData.data[0].id);
      return { success: true, asaasId: searchData.data[0].id };
    }

    // Build customer payload
    const customerPayload: any = {
      name: client.name,
      email: client.email,
      externalReference: client.id,
    };

    // Add phone if valid
    if (client.phone) {
      const cleanPhone = client.phone.replace(/\D/g, '');
      if (cleanPhone.length >= 10) {
        customerPayload.phone = cleanPhone;
      }
    }

    // Add cpfCnpj if valid (11 or 14 digits)
    if (client.document) {
      const cleanDoc = client.document.replace(/\D/g, '');
      if (cleanDoc.length === 11 || cleanDoc.length === 14) {
        customerPayload.cpfCnpj = cleanDoc;
      }
    }

    console.log('Creating customer in ASAAS:', customerPayload);

    const createResponse = await fetch(`${ASAAS_BASE_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
      },
      body: JSON.stringify(customerPayload),
    });

    const createData = await createResponse.json();

    if (!createResponse.ok) {
      console.error('ASAAS customer creation error:', createData);
      return { success: false, error: createData.errors?.[0]?.description || 'Erro ao criar cliente no ASAAS' };
    }

    console.log('Customer created in ASAAS:', createData.id);
    return { success: true, asaasId: createData.id };
  } catch (error) {
    console.error('Error syncing to ASAAS:', error);
    return { success: false, error: 'Erro de conexão com ASAAS' };
  }
}

// Simple hash function for password (in production, use bcrypt)
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

    console.log('Client Auth Action:', action);

    switch (action) {
      case 'login': {
        const { email, password } = body;
        
        if (!email || !password) {
          return new Response(
            JSON.stringify({ error: 'Email e senha são obrigatórios' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const passwordHash = await hashPassword(password);
        
        const { data: clientUser, error } = await supabase
          .from('client_users')
          .select('*, clients(*)')
          .eq('email', email.toLowerCase())
          .eq('password_hash', passwordHash)
          .single();

        if (error || !clientUser) {
          console.log('Login failed:', email);
          return new Response(
            JSON.stringify({ error: 'Email ou senha incorretos' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Generate session token
        const token = generateToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

        const { error: sessionError } = await supabase
          .from('client_sessions')
          .insert({
            client_user_id: clientUser.id,
            token,
            expires_at: expiresAt.toISOString()
          });

        if (sessionError) {
          console.error('Session creation error:', sessionError);
          return new Response(
            JSON.stringify({ error: 'Erro ao criar sessão' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update last login
        await supabase
          .from('client_users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', clientUser.id);

        console.log('Login successful:', email);
        return new Response(
          JSON.stringify({ 
            token, 
            client: clientUser.clients,
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
          .from('client_sessions')
          .select('*, client_users(*, clients(*))')
          .eq('token', token)
          .gt('expires_at', new Date().toISOString())
          .single();

        if (error || !session) {
          return new Response(
            JSON.stringify({ error: 'Sessão inválida ou expirada' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ 
            client: session.client_users.clients,
            clientUser: {
              id: session.client_users.id,
              email: session.client_users.email
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'logout': {
        const { token } = body;
        
        if (token) {
          await supabase
            .from('client_sessions')
            .delete()
            .eq('token', token);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'register': {
        const { clientId, email, password } = body;
        
        if (!clientId || !email || !password) {
          return new Response(
            JSON.stringify({ error: 'Dados incompletos' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if client exists
        const { data: client, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', clientId)
          .single();

        if (clientError || !client) {
          return new Response(
            JSON.stringify({ error: 'Cliente não encontrado' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if user already exists
        const { data: existingUser } = await supabase
          .from('client_users')
          .select('id')
          .eq('email', email.toLowerCase())
          .single();

        if (existingUser) {
          return new Response(
            JSON.stringify({ error: 'Email já cadastrado' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const passwordHash = await hashPassword(password);

        const { data: newUser, error: createError } = await supabase
          .from('client_users')
          .insert({
            client_id: clientId,
            email: email.toLowerCase(),
            password_hash: passwordHash
          })
          .select()
          .single();

        if (createError) {
          console.error('User creation error:', createError);
          return new Response(
            JSON.stringify({ error: 'Erro ao criar usuário' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('User registered:', email);
        return new Response(
          JSON.stringify({ success: true, userId: newUser.id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'self-register': {
        const { name, email, phone, document, password } = body;
        
        if (!name || !email || !password) {
          return new Response(
            JSON.stringify({ error: 'Nome, email e senha são obrigatórios' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if email already exists in clients
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('email', email.toLowerCase())
          .single();

        if (existingClient) {
          // Check if client already has a user account
          const { data: existingUser } = await supabase
            .from('client_users')
            .select('id')
            .eq('client_id', existingClient.id)
            .single();

          if (existingUser) {
            return new Response(
              JSON.stringify({ error: 'Este email já possui uma conta. Faça login.' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        // Check if email already exists in client_users
        const { data: existingUserByEmail } = await supabase
          .from('client_users')
          .select('id')
          .eq('email', email.toLowerCase())
          .single();

        if (existingUserByEmail) {
          return new Response(
            JSON.stringify({ error: 'Este email já está cadastrado' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create the client first
        const { data: newClient, error: clientCreateError } = await supabase
          .from('clients')
          .insert({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone || null,
            document: document || null,
            status: 'active'
          })
          .select()
          .single();

        if (clientCreateError) {
          console.error('Client creation error:', clientCreateError);
          return new Response(
            JSON.stringify({ error: 'Erro ao criar cadastro do cliente' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Now create the client user
        const passwordHash = await hashPassword(password);

        const { data: newUser, error: userCreateError } = await supabase
          .from('client_users')
          .insert({
            client_id: newClient.id,
            email: email.toLowerCase().trim(),
            password_hash: passwordHash
          })
          .select()
          .single();

        if (userCreateError) {
          console.error('User creation error:', userCreateError);
          // Rollback: delete the client if user creation fails
          await supabase.from('clients').delete().eq('id', newClient.id);
          return new Response(
            JSON.stringify({ error: 'Erro ao criar conta de acesso' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Sync client to ASAAS in background
        const asaasResult = await syncCustomerToAsaas({
          id: newClient.id,
          name: newClient.name,
          email: newClient.email,
          phone: newClient.phone,
          document: newClient.document,
        });

        console.log('Self-registration completed:', email, 'Client ID:', newClient.id, 'ASAAS sync:', asaasResult.success ? asaasResult.asaasId : 'failed');
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            clientId: newClient.id,
            userId: newUser.id,
            asaasSynced: asaasResult.success,
            asaasId: asaasResult.asaasId,
            message: 'Cadastro realizado com sucesso!'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'reset-password': {
        const { clientId, password } = body;
        
        if (!clientId || !password) {
          return new Response(
            JSON.stringify({ error: 'Dados incompletos' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Find user by client_id
        const { data: existingUser, error: findError } = await supabase
          .from('client_users')
          .select('id')
          .eq('client_id', clientId)
          .single();

        if (findError || !existingUser) {
          return new Response(
            JSON.stringify({ error: 'Usuário não encontrado' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const passwordHash = await hashPassword(password);

        const { error: updateError } = await supabase
          .from('client_users')
          .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
          .eq('id', existingUser.id);

        if (updateError) {
          console.error('Password update error:', updateError);
          return new Response(
            JSON.stringify({ error: 'Erro ao atualizar senha' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Password reset for client:', clientId);
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
    console.error('Client Auth Error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
