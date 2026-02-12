import { useState } from 'react';
import { toast } from 'sonner';

interface CreatePixPaymentParams {
  amount: number;
  description: string;
  clientId: string;
  clientEmail: string;
  clientName: string;
  clientDocument?: string;
  subscriptionId?: string;
}

interface PixPaymentResult {
  success: boolean;
  paymentId?: string;
  qrCode?: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
  expirationDate?: string;
  status?: string;
  error?: string;
}

interface PaymentStatusResult {
  success: boolean;
  status?: string;
  statusDetail?: string;
  paidAt?: string;
  error?: string;
}

export function useMercadoPago() {
  const [loading, setLoading] = useState(false);

  const createPixPayment = async (params: CreatePixPaymentParams): Promise<PixPaymentResult | null> => {
    setLoading(true);
    try {
      console.log('Creating PIX payment via Mercado Pago:', params);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mercadopago?action=create-pix`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify(params),
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        console.error('Error creating PIX payment:', result.error);
        toast.error(result.error || 'Erro ao criar pagamento PIX');
        return null;
      }

      toast.success('QR Code PIX gerado com sucesso!');
      return result;
    } catch (error: any) {
      console.error('Error in createPixPayment:', error);
      toast.error('Erro ao criar pagamento PIX');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async (paymentId: string): Promise<PaymentStatusResult | null> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mercadopago?action=check-status&paymentId=${paymentId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        console.error('Error checking payment status:', result.error);
        return null;
      }

      return result;
    } catch (error: any) {
      console.error('Error in checkPaymentStatus:', error);
      return null;
    }
  };

  const createPreference = async (params: {
    amount: number;
    title: string;
    description?: string;
    clientEmail: string;
    externalReference?: string;
  }) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mercadopago?action=create-preference`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify(params),
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        console.error('Error creating preference:', result.error);
        toast.error(result.error || 'Erro ao criar preferência');
        return null;
      }

      return result;
    } catch (error: any) {
      console.error('Error in createPreference:', error);
      toast.error('Erro ao criar preferência');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    createPixPayment,
    checkPaymentStatus,
    createPreference,
  };
}
