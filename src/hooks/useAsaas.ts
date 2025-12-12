import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
  phone: string;
}

interface AsaasPayment {
  id: string;
  customer: string;
  value: number;
  netValue: number;
  billingType: string;
  status: string;
  dueDate: string;
  paymentDate?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
}

interface AsaasSubscription {
  id: string;
  customer: string;
  value: number;
  cycle: string;
  status: string;
  nextDueDate: string;
}

export const useAsaas = () => {
  const [loading, setLoading] = useState(false);

  const invokeAsaas = async (action: string, params?: Record<string, any>, body?: any) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({ action, ...params });
      
      const { data, error } = await supabase.functions.invoke('asaas', {
        body: body || {},
        method: body ? 'POST' : 'GET',
      });

      // Since we can't pass query params easily, let's restructure
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/asaas?${queryParams}`,
        {
          method: body ? 'POST' : 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: body ? JSON.stringify(body) : undefined,
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erro na integração com ASAAS');
      }

      return result;
    } catch (error: any) {
      console.error('ASAAS Error:', error);
      toast.error(error.message || 'Erro na integração com ASAAS');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Customer operations
  const createCustomer = async (data: { name: string; email: string; cpfCnpj?: string; phone?: string }) => {
    return invokeAsaas('createCustomer', {}, data);
  };

  const syncCustomerToAsaas = async (clientId: string) => {
    return invokeAsaas('syncCustomerToAsaas', {}, { clientId });
  };

  const listCustomers = async () => {
    return invokeAsaas('listCustomers');
  };

  // Payment operations
  const createPayment = async (data: {
    customer: string;
    billingType: 'BOLETO' | 'PIX' | 'CREDIT_CARD';
    value: number;
    dueDate: string;
    description?: string;
    externalReference?: string;
  }) => {
    return invokeAsaas('createPayment', {}, data);
  };

  const getPayment = async (paymentId: string) => {
    return invokeAsaas('getPayment', { paymentId });
  };

  const listPayments = async (customerId?: string) => {
    return invokeAsaas('listPayments', customerId ? { customerId } : {});
  };

  const getPixQrCode = async (paymentId: string) => {
    return invokeAsaas('getPixQrCode', { paymentId });
  };

  const getBoletoData = async (paymentId: string) => {
    return invokeAsaas('getBoletoData', { paymentId });
  };

  // Subscription operations
  const createSubscription = async (data: {
    customer: string;
    billingType: 'BOLETO' | 'PIX' | 'CREDIT_CARD';
    value: number;
    nextDueDate: string;
    cycle: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
    description?: string;
    externalReference?: string;
  }) => {
    return invokeAsaas('createSubscription', {}, data);
  };

  const getSubscription = async (subscriptionId: string) => {
    return invokeAsaas('getSubscription', { subscriptionId });
  };

  const listSubscriptions = async (customerId?: string) => {
    return invokeAsaas('listSubscriptions', customerId ? { customerId } : {});
  };

  const cancelSubscription = async (subscriptionId: string) => {
    return invokeAsaas('cancelSubscription', {}, { subscriptionId });
  };

  // Notification settings
  const getNotificationSettings = async (customerId: string) => {
    return invokeAsaas('getNotificationSettings', { customerId });
  };

  const updateNotificationSettings = async (data: {
    customerId: string;
    emailEnabledForCustomer?: boolean;
    smsEnabledForCustomer?: boolean;
    phoneCallEnabledForCustomer?: boolean;
  }) => {
    return invokeAsaas('updateNotificationSettings', {}, data);
  };

  // Sync operations
  const syncPaymentStatus = async (paymentId: string, asaasPaymentId: string) => {
    return invokeAsaas('syncPaymentStatus', {}, { paymentId, asaasPaymentId });
  };

  return {
    loading,
    // Customers
    createCustomer,
    syncCustomerToAsaas,
    listCustomers,
    // Payments
    createPayment,
    getPayment,
    listPayments,
    getPixQrCode,
    getBoletoData,
    // Subscriptions
    createSubscription,
    getSubscription,
    listSubscriptions,
    cancelSubscription,
    // Notifications
    getNotificationSettings,
    updateNotificationSettings,
    // Sync
    syncPaymentStatus,
  };
};
