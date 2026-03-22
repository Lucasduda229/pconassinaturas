import { CardPayment, initMercadoPago } from '@mercadopago/sdk-react';
import { CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { calculateCardPricing } from '@/utils/cardFees';

const MERCADO_PAGO_PUBLIC_KEY = 'APP_USR-ee8c080e-cad1-4b48-8965-6f2b0a1abcbd';

initMercadoPago(MERCADO_PAGO_PUBLIC_KEY);

export interface ProposalCardPaymentFormData {
  token: string;
  issuer_id: string;
  payment_method_id: string;
  transaction_amount: number;
  installments: number;
  payer?: {
    email?: string;
    identification?: {
      type?: string;
      number?: string;
    };
  };
}

interface ProposalCardPaymentProps {
  amount: number;
  payerEmail?: string | null;
  payerName: string;
  payerDocument?: string | null;
  installments: number;
  onInstallmentsChange: (value: number) => void;
  submitting: boolean;
  onSubmit: (data: ProposalCardPaymentFormData) => Promise<void>;
}

const normalizeDocument = (value?: string | null) => value?.replace(/\D/g, '') || '';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatPercent = (value: number) => `${(value * 100).toFixed(2).replace('.', ',')}%`;

const ProposalCardPayment = ({
  amount,
  payerEmail,
  payerName,
  payerDocument,
  installments,
  onInstallmentsChange,
  submitting,
  onSubmit,
}: ProposalCardPaymentProps) => {
  const cleanDocument = normalizeDocument(payerDocument);
  const pricing = calculateCardPricing(amount, installments);
  const installmentOptions = [1, 2, 3, 4].map((option) => ({
    value: option,
    pricing: calculateCardPricing(amount, option),
  }));
  const formKey = `${amount}-${installments}-${payerEmail || 'guest'}-${cleanDocument || 'no-doc'}`;

  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-secondary/10 p-4">
      <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-background/30 p-4">
        <CreditCard className="mt-0.5 h-5 w-5 text-primary" />
        <div>
          <p className="font-medium text-foreground">Pagamento com cartão</p>
          <p className="text-sm text-muted-foreground">
            Preencha os dados do cartão abaixo e escolha o parcelamento em até 4x.
          </p>
        </div>
      </div>

      <div className={submitting ? 'pointer-events-none opacity-70' : ''}>
        <div className="mb-4 space-y-2 rounded-xl border border-border/60 bg-background/30 p-3">
          <p className="text-sm font-medium text-foreground">Parcelamento</p>
          <select
            value={installments}
            onChange={(event) => onInstallmentsChange(Number(event.target.value))}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            {installmentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.value}x de {formatCurrency(option.pricing.installmentAmount)}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Você recebe {formatCurrency(pricing.requestedAmount)} e o cliente paga{' '}
            <span className="font-medium text-foreground">
              {formatCurrency(pricing.totalCustomerAmount)} em {pricing.installments}x de {formatCurrency(pricing.installmentAmount)}
            </span>
            .
          </p>
          <p className="text-xs text-muted-foreground">
            Taxa base de {formatPercent(pricing.baseFeeRate)}
            {pricing.installmentSurchargeRate > 0
              ? ` + taxa do parcelamento de ${formatPercent(pricing.installmentSurchargeRate)}`
              : ''}
            .
          </p>
        </div>

        <CardPayment
          key={formKey}
          initialization={{
            amount: pricing.totalCustomerAmount,
            payer: {
              email: payerEmail || undefined,
              identification: cleanDocument
                ? {
                    type: cleanDocument.length <= 11 ? 'CPF' : 'CNPJ',
                    number: cleanDocument,
                  }
                : undefined,
            },
          } as any}
          customization={{
            paymentMethods: {
              minInstallments: 1,
              maxInstallments: 4,
              types: {
                included: ['credit_card'],
              },
            },
          } as any}
          locale="pt-BR"
          onSubmit={async (formData) => {
            await onSubmit({
              ...(formData as ProposalCardPaymentFormData),
              transaction_amount: pricing.totalCustomerAmount,
              installments,
            });
          }}
          onError={(error) => {
            console.error('Erro no formulário de cartão do Mercado Pago:', error);
            toast.error('Não foi possível carregar o formulário do cartão');
          }}
          onReady={() => {
            console.log('Formulário de cartão pronto para', payerName);
          }}
        />
      </div>

      {submitting && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-background/40 px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Processando pagamento no cartão...
        </div>
      )}
    </div>
  );
};

export default ProposalCardPayment;