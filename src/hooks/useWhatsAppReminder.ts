import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SendReminderParams {
  clientId: string;
  clientName: string;
  clientPhone: string | null;
  type: 'subscription' | 'payment' | 'overdue';
  amount: number;
  description?: string;
}

export const useWhatsAppReminder = () => {
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

  const sendReminder = async (params: SendReminderParams): Promise<boolean> => {
    const { clientId, clientName, clientPhone, type, amount, description } = params;

    if (!clientPhone) {
      toast.error('Cliente não possui telefone cadastrado');
      return false;
    }

    setSendingReminderId(clientId);

    try {
      // Build the message based on type
      let message = '';
      const formattedAmount = amount.toFixed(2).replace('.', ',');

      if (type === 'subscription') {
        message = `Ola ${clientName}! 💈\n\n` +
          `Passando para lembrar que sua assinatura${description ? ` do *${description}*` : ''} no valor de *R$ ${formattedAmount}* vence amanha.\n\n` +
          `Mantenha seu acesso ao sistema de agendamento da barbearia em dia!\n\n` +
          `Qualquer duvida, estamos a disposicao.`;
      } else if (type === 'payment') {
        message = `Ola ${clientName}! 💈\n\n` +
          `Sua fatura no valor de *R$ ${formattedAmount}*` +
          (description ? ` referente a *${description}*` : '') + ` esta pendente e vence amanha.\n\n` +
          `Mantenha o sistema de agendamento da sua barbearia funcionando!\n\n` +
          `Qualquer duvida, estamos a disposicao.`;
      } else if (type === 'overdue') {
        message = `Ola ${clientName}! 💈\n\n` +
          `⚠️ Sua assinatura de *R$ ${formattedAmount}*` +
          (description ? ` referente a *${description}*` : '') +
          ` esta vencida.\n\n` +
          `Regularize o pagamento para continuar usando o sistema de agendamento da sua barbearia sem interrupcoes.\n\n` +
          `Entre em contato se precisar de ajuda.`;
      }

      // Format phone number
      let formattedPhone = clientPhone.replace(/\D/g, '');
      if (!formattedPhone.startsWith('55')) {
        formattedPhone = '55' + formattedPhone;
      }

      // Call the edge function
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          phone: formattedPhone,
          message: message,
          clientId: clientId,
          type: type,
        },
      });

      if (error) {
        console.error('Error sending WhatsApp:', error);
        toast.error('Erro ao enviar mensagem de WhatsApp');
        return false;
      }

      if (data?.success) {
        toast.success('Mensagem enviada com sucesso!');
        return true;
      } else {
        toast.error(data?.error || 'Erro ao enviar mensagem');
        return false;
      }
    } catch (error) {
      console.error('Error sending WhatsApp reminder:', error);
      toast.error('Erro ao enviar lembrete');
      return false;
    } finally {
      setSendingReminderId(null);
    }
  };

  return {
    sendReminder,
    sendingReminderId,
    isSending: sendingReminderId !== null,
  };
};
