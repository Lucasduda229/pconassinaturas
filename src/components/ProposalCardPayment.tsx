import { CardPayment, initMercadoPago } from '@mercadopago/sdk-react';
import { CreditCard, Loader2, Lock, ShieldCheck, Sparkles } from 'lucide-react';
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
    <div className="space-y-4 rounded-2xl border border-primary/20 bg-card shadow-[var(--shadow-lg)] backdrop-blur-sm overflow-hidden">
      <div className="bg-gradient-to-r from-primary/20 via-accent/15 to-secondary/40 px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="rounded-xl border border-primary/30 bg-primary/15 p-2.5">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="flex items-center gap-2 font-semibold text-foreground">
                  Cartão de crédito ou débito
                  <Sparkles className="h-4 w-4 text-primary" />
                </p>
                <p className="text-sm text-muted-foreground">
                  Preencha os dados abaixo e escolha em até 4x.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-success/20 bg-success/10 px-3 py-1 text-xs font-medium text-success">
              <ShieldCheck className="h-3.5 w-3.5" />
              Ambiente protegido
            </div>
          </div>
        </div>

      <div className="space-y-4 p-4">
          <div className="grid gap-3 rounded-2xl bg-background/30 p-4 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div>
              <p className="text-sm font-medium text-foreground">Resumo do pagamento</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Você recebe {formatCurrency(pricing.requestedAmount)} e o cliente visualiza o valor final já ajustado.
              </p>
            </div>

            <div className="rounded-xl bg-primary/10 p-3 text-right">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total no cartão</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{formatCurrency(pricing.totalCustomerAmount)}</p>
              <p className="text-xs text-primary">
                {pricing.installments}x de {formatCurrency(pricing.installmentAmount)}
              </p>
            </div>
          </div>

          <div className={submitting ? 'pointer-events-none opacity-70' : ''}>
            <div className="mb-4 space-y-2 rounded-xl bg-background/30 p-3">
              <p className="text-sm font-medium text-foreground">Parcelamento</p>
              <select
                value={installments}
                onChange={(event) => onInstallmentsChange(Number(event.target.value))}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
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

            <div className="overflow-hidden rounded-2xl bg-card/95 p-4 shadow-[var(--shadow-md)]">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 pb-3">
                <div>
                  <p className="font-medium text-foreground">Dados do cartão</p>
                  <p className="text-xs text-muted-foreground">Visual personalizado com a identidade da proposta.</p>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="h-3.5 w-3.5 text-primary" />
                  Pagamento seguro
                </div>
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
                  visual: {
                    style: {
                      theme: 'dark',
                      customVariables: {
                        formBackgroundColor: 'hsl(var(--card))',
                        inputBackgroundColor: 'hsl(var(--background))',
                        textPrimaryColor: 'hsl(var(--foreground))',
                        textSecondaryColor: 'hsl(var(--muted-foreground))',
                        baseColor: 'hsl(var(--primary))',
                        baseColorFirstVariant: 'hsl(var(--accent))',
                        baseColorSecondVariant: 'hsl(var(--secondary))',
                        outlinePrimaryColor: 'hsl(var(--primary))',
                        outlineSecondaryColor: 'hsl(var(--border))',
                        buttonTextColor: 'hsl(var(--primary-foreground))',
                        inputBorderWidth: '1px',
                        inputFocusedBorderWidth: '1px',
                        inputVerticalPadding: '14px',
                        inputHorizontalPadding: '14px',
                        fontSizeMedium: '15px',
                        fontSizeLarge: '16px',
                        fontWeightNormal: '500',
                        fontWeightSemiBold: '600',
                        borderRadiusSmall: '12px',
                        borderRadiusMedium: '16px',
                        borderRadiusLarge: '20px',
                      },
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
          </div>
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