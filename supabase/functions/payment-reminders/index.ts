import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Payment Reminders - Starting job...");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Get subscriptions that are due in the next 3 days
    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const { data: subscriptions, error: subError } = await supabase
      .from("subscriptions")
      .select("*, clients(id, name, email, phone)")
      .eq("status", "active")
      .gte("next_payment", today.toISOString())
      .lte("next_payment", threeDaysFromNow.toISOString());

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      throw subError;
    }

    console.log(`Found ${subscriptions?.length || 0} subscriptions due soon`);

    const notificationsSent: string[] = [];

    for (const subscription of subscriptions || []) {
      const client = subscription.clients;
      if (!client) continue;

      const dueDate = new Date(subscription.next_payment);
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Check if we already sent a reminder today for this subscription
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: existingNotification } = await supabase
        .from("notifications")
        .select("id")
        .eq("client_id", client.id)
        .eq("type", "payment_due")
        .gte("sent_at", todayStart.toISOString())
        .maybeSingle();

      if (existingNotification) {
        console.log(`Skipping ${client.name} - already notified today`);
        continue;
      }

      const amount = new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL' 
      }).format(subscription.value);

      const formattedDate = dueDate.toLocaleDateString('pt-BR');

      let message = '';
      if (daysUntilDue === 0) {
        message = `Olá ${client.name}! Seu pagamento de ${amount} vence hoje (${formattedDate}). Não se esqueça de realizar o pagamento.`;
      } else if (daysUntilDue === 1) {
        message = `Olá ${client.name}! Seu pagamento de ${amount} vence amanhã (${formattedDate}). Realize o pagamento para evitar atrasos.`;
      } else {
        message = `Olá ${client.name}! Seu pagamento de ${amount} vence em ${daysUntilDue} dias (${formattedDate}). Acesse seu painel para pagar.`;
      }

      // Create notification
      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          client_id: client.id,
          type: "payment_due",
          message: message,
          status: "sent",
        });

      if (notifError) {
        console.error(`Error creating notification for ${client.name}:`, notifError);
      } else {
        notificationsSent.push(client.name);
        console.log(`Notification sent to ${client.name}`);
      }
    }

    // Also check for overdue subscriptions
    const { data: overdueSubscriptions, error: overdueError } = await supabase
      .from("subscriptions")
      .select("*, clients(id, name, email, phone)")
      .eq("status", "active")
      .lt("next_payment", today.toISOString());

    if (!overdueError && overdueSubscriptions) {
      console.log(`Found ${overdueSubscriptions.length} overdue subscriptions`);

      for (const subscription of overdueSubscriptions) {
        const client = subscription.clients;
        if (!client) continue;

        const dueDate = new Date(subscription.next_payment);
        const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        // Only send overdue notification once per week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const { data: existingOverdueNotif } = await supabase
          .from("notifications")
          .select("id")
          .eq("client_id", client.id)
          .eq("type", "payment_failed")
          .gte("sent_at", weekAgo.toISOString())
          .maybeSingle();

        if (existingOverdueNotif) {
          continue;
        }

        const amount = new Intl.NumberFormat('pt-BR', { 
          style: 'currency', 
          currency: 'BRL' 
        }).format(subscription.value);

        const message = `Olá ${client.name}! Seu pagamento de ${amount} está ${daysOverdue} dia(s) em atraso. Por favor, regularize para evitar a suspensão do serviço.`;

        await supabase
          .from("notifications")
          .insert({
            client_id: client.id,
            type: "payment_failed",
            message: message,
            status: "sent",
          });

        notificationsSent.push(`${client.name} (overdue)`);
      }
    }

    console.log(`Payment Reminders completed. Sent ${notificationsSent.length} notifications.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsSent: notificationsSent.length,
        clients: notificationsSent 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error("Payment Reminders Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
