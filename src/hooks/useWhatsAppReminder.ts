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
        message = `Olá ${clientName}! 👋\n\n` +
          `Lembramos que sua assinatura${description ? ` *${description}*` : ''} no valor de *R$ ${formattedAmount}* está próxima do vencimento.\n\n` +
          `Para evitar interrupção do serviço, realize o pagamento até a data de vencimento.\n\n` +
          `Qualquer dúvida, estamos à disposição! 🙌`;
      } else if (type === 'payment') {
        message = `Olá ${clientName}! 👋\n\n` +
          `Identificamos que você possui um pagamento pendente de *R$ ${formattedAmount}*` +
          (description ? ` referente a *${description}*` : '') + `.\n\n` +
          `Por favor, regularize seu pagamento para manter seu acesso ativo.\n\n` +
          `Qualquer dúvida, estamos à disposição! 🙌`;
      } else if (type === 'overdue') {
        message = `Olá ${clientName}! ⚠️\n\n` +
          `Seu pagamento de *R$ ${formattedAmount}*` +
          (description ? ` referente a *${description}*` : '') +
          ` encontra-se em atraso.\n\n` +
          `Para evitar a suspensão dos serviços, por favor regularize sua situação o mais breve possível.\n\n` +
          `Entre em contato conosco para mais informações. 📞`;
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
