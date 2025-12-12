import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useAsaas } from '@/hooks/useAsaas';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Loader2, 
  LogOut, 
  CreditCard, 
  QrCode, 
  Calendar, 
  DollarSign,
  CheckCircle,
  AlertCircle,
  Copy,
  Shield,
  ArrowRight,
  X
} from 'lucide-react';
import logo from '@/assets/logo-pcon-grande.png';
import logoAsaas from '@/assets/logo-asaas-white.png';
import BlueBackground from '@/components/BlueBackground';

interface Subscription {
  id: string;
  plan_name: string;
  value: number;
  status: string;
  next_payment: string;
  start_date: string;
}

const Checkout = () => {
  const { client, isAuthenticated, isLoading: authLoading, logout } = useClientAuth();
  const navigate = useNavigate();
  const { createCustomer, createPayment, getPixQrCode, loading: asaasLoading } = useAsaas();
  
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT_CARD' | null>(null);
  const [pixData, setPixData] = useState<{ qrCode: string; copyPaste: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'select' | 'processing' | 'pix' | 'success' | 'error'>('select');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/cliente');
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (client?.id) {
      fetchSubscription();
    }
  }, [client?.id]);

  const fetchSubscription = async () => {
    if (!client?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('client_id', client.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching subscription:', error);
      }
      
      setSubscription(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/cliente');
  };

  const openPaymentModal = () => {
    setIsPaymentDialogOpen(true);
    setPaymentStep('select');
    setPixData(null);
  };

  const handlePayment = async (method: 'PIX' | 'CREDIT_CARD') => {
    if (!client || !subscription) return;
    
    setPaymentMethod(method);
    setPaymentStep('processing');
    setIsProcessing(true);
    setPixData(null);

    try {
      const customerResult = await createCustomer({
        name: client.name,
        email: client.email,
        cpfCnpj: client.document || undefined,
        phone: client.phone || undefined,
      });

      if (!customerResult?.id) {
        throw new Error('Erro ao criar cliente no gateway de pagamento');
      }

      const dueDate = format(new Date(), 'yyyy-MM-dd');
      const paymentResult = await createPayment({
        customer: customerResult.id,
        billingType: method,
        value: Number(subscription.value),
        dueDate,
        description: `Pagamento - ${subscription.plan_name}`,
        externalReference: subscription.id,
      });

      if (!paymentResult?.id) {
        throw new Error('Erro ao criar cobrança');
      }

      if (method === 'PIX') {
        const pixResult = await getPixQrCode(paymentResult.id);
        if (pixResult) {
          setPixData({
            qrCode: pixResult.encodedImage,
            copyPaste: pixResult.payload,
          });
          setPaymentStep('pix');
        }
      } else if (method === 'CREDIT_CARD') {
        if (paymentResult.invoiceUrl) {
          window.open(paymentResult.invoiceUrl, '_blank');
          setPaymentStep('success');
          toast.success('Redirecionando para pagamento...');
        }
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      setPaymentStep('error');
      toast.error(error.message || 'Erro ao processar pagamento');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyPixCode = () => {
    if (pixData?.copyPaste) {
      navigator.clipboard.writeText(pixData.copyPaste);
      toast.success('Código PIX copiado!');
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      active: { 
        label: 'Ativa', 
        className: 'bg-success/20 text-success border-success/30',
        icon: <CheckCircle className="h-3 w-3" />
      },
      pending: { 
        label: 'Pendente', 
        className: 'bg-warning/20 text-warning border-warning/30',
        icon: <AlertCircle className="h-3 w-3" />
      },
      cancelled: { 
        label: 'Cancelada', 
        className: 'bg-destructive/20 text-destructive border-destructive/30',
        icon: <AlertCircle className="h-3 w-3" />
      },
    };
    return configs[status] || { label: status, className: 'bg-muted text-muted-foreground', icon: null };
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <BlueBackground />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative z-10 flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 rounded-full spinner-blue" />
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <BlueBackground />
      
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-20 glass-card border-b border-border/20 sticky top-0"
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <img src={logo} alt="Logo" className="h-14 sm:h-16 w-auto" />
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {client?.name?.split(' ')[0]}
            </span>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-10 sm:py-16 max-w-xl">
        <div className="space-y-8">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground mb-2">
              Minha Assinatura
            </h1>
            <p className="text-gray-neutral text-sm">
              Gerencie e realize pagamentos com segurança
            </p>
          </motion.div>

          {/* Subscription Card */}
          {subscription ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="glass-card p-6 sm:p-8"
            >
              {/* Plan Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-heading font-semibold text-foreground">
                    {subscription.plan_name}
                  </h2>
                  <p className="text-gray-neutral text-sm mt-1">Plano ativo</p>
                </div>
                <Badge 
                  className={`${getStatusConfig(subscription.status).className} flex items-center gap-1.5 px-3 py-1 border rounded-full text-xs`}
                >
                  {getStatusConfig(subscription.status).icon}
                  {getStatusConfig(subscription.status).label}
                </Badge>
              </div>

              {/* Info Cards */}
              <div className="grid gap-4 sm:grid-cols-2 mb-6">
                <motion.div 
                  className="p-4 rounded-xl bg-secondary/30 border border-border/30"
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(30, 79, 163, 0.2)' }}>
                      <DollarSign className="h-5 w-5" style={{ color: '#1E4FA3' }} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-neutral">Valor</p>
                      <p className="text-lg font-semibold text-foreground">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(subscription.value))}
                      </p>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  className="p-4 rounded-xl bg-secondary/30 border border-border/30"
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(42, 63, 134, 0.2)' }}>
                      <Calendar className="h-5 w-5" style={{ color: '#2A3F86' }} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-neutral">Vencimento</p>
                      <p className="text-lg font-semibold text-foreground">
                        {format(new Date(subscription.next_payment), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Divider */}
              <div className="h-px bg-border/30 mb-6" />

              {/* Pay Button */}
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Button
                  size="lg"
                  className="w-full h-14 btn-blue text-base"
                  onClick={openPaymentModal}
                  disabled={isProcessing || asaasLoading}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processando...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Pagar Agora
                      <ArrowRight className="h-5 w-5" />
                    </span>
                  )}
                </Button>
              </motion.div>

              {/* Security Badge */}
              <div className="mt-6 flex items-center justify-center gap-2 text-gray-neutral">
                <Shield className="h-4 w-4" />
                <span className="text-xs">Pagamento 100% seguro</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="glass-card p-10 text-center"
            >
              <AlertCircle className="h-14 w-14 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-heading font-semibold mb-2">Nenhuma assinatura ativa</h3>
              <p className="text-gray-neutral text-sm">
                Você não possui uma assinatura ativa no momento.
              </p>
            </motion.div>
          )}
        </div>

        {/* Footer with Payment Methods */}
        <motion.footer
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mt-12 pb-8"
        >
          <div className="flex flex-col items-center gap-4">
            <p className="text-xs text-gray-neutral">Pagamentos processados por</p>
            <img src={logoAsaas} alt="ASAAS" className="h-8 w-auto opacity-80" />
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/30 border border-border/30">
                <QrCode className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">PIX</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/30 border border-border/30">
                <CreditCard className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Cartão</span>
              </div>
            </div>
          </div>
        </motion.footer>
      </main>

      {/* Payment Modal */}
      <AnimatePresence>
        {isPaymentDialogOpen && (
          <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
            <DialogContent className="glass-card border-border/30 sm:max-w-md p-0 overflow-hidden">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="p-6 sm:p-8"
              >
                {/* Close button */}
                <button
                  onClick={() => setIsPaymentDialogOpen(false)}
                  className="absolute top-4 right-4 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>

                {/* Select Payment Method */}
                {paymentStep === 'select' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="text-center">
                      <h2 className="text-xl font-heading font-semibold text-foreground mb-2">
                        Escolha o pagamento
                      </h2>
                      <p className="text-gray-neutral text-sm">
                        Selecione a forma de pagamento
                      </p>
                    </div>

                    <div className="space-y-3">
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handlePayment('PIX')}
                        className="w-full p-4 rounded-xl bg-secondary/30 border border-border/30 hover:border-primary/40 transition-all duration-200 flex items-center gap-4 group"
                      >
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(30, 79, 163, 0.15)' }}>
                          <QrCode className="h-6 w-6" style={{ color: '#1E4FA3' }} />
                        </div>
                        <div className="text-left flex-1">
                          <p className="font-medium text-foreground">PIX</p>
                          <p className="text-xs text-gray-neutral">Aprovação instantânea</p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handlePayment('CREDIT_CARD')}
                        className="w-full p-4 rounded-xl bg-secondary/30 border border-border/30 hover:border-primary/40 transition-all duration-200 flex items-center gap-4 group"
                      >
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(42, 63, 134, 0.15)' }}>
                          <CreditCard className="h-6 w-6" style={{ color: '#2A3F86' }} />
                        </div>
                        <div className="text-left flex-1">
                          <p className="font-medium text-foreground">Cartão de Crédito</p>
                          <p className="text-xs text-gray-neutral">Parcele em até 12x</p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* Processing */}
                {paymentStep === 'processing' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-10 flex flex-col items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-full spinner-blue" />
                    <p className="text-foreground font-medium">Processando pagamento...</p>
                    <p className="text-gray-neutral text-sm">Aguarde um momento</p>
                  </motion.div>
                )}

                {/* PIX QR Code */}
                {paymentStep === 'pix' && pixData && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="text-center">
                      <h2 className="text-xl font-heading font-semibold text-foreground mb-2">
                        Pagamento PIX
                      </h2>
                      <p className="text-gray-neutral text-sm">
                        Escaneie o QR Code para pagar
                      </p>
                    </div>

                    <div className="flex justify-center p-4 bg-white rounded-xl">
                      <img 
                        src={`data:image/png;base64,${pixData.qrCode}`} 
                        alt="QR Code PIX" 
                        className="w-44 h-44"
                      />
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-gray-neutral text-center">Ou copie o código:</p>
                      <div className="flex gap-2">
                        <code className="flex-1 p-3 bg-secondary/40 rounded-lg text-xs break-all max-h-16 overflow-y-auto border border-border/30 text-muted-foreground">
                          {pixData.copyPaste}
                        </code>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button 
                            size="icon" 
                            className="btn-blue h-12 w-12"
                            onClick={copyPixCode}
                          >
                            <Copy className="h-5 w-5" />
                          </Button>
                        </motion.div>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: '#1E4FA3' }} />
                      <p className="text-xs text-foreground/80">
                        A confirmação será automática após o pagamento.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Success */}
                {paymentStep === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-8 flex flex-col items-center gap-4 text-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
                      <CheckCircle className="h-8 w-8 text-success" />
                    </div>
                    <h3 className="text-lg font-heading font-semibold text-foreground">
                      Redirecionado com sucesso!
                    </h3>
                    <p className="text-gray-neutral text-sm">
                      Complete o pagamento na nova janela.
                    </p>
                  </motion.div>
                )}

                {/* Error */}
                {paymentStep === 'error' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-8 flex flex-col items-center gap-4 text-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
                      <AlertCircle className="h-8 w-8 text-destructive" />
                    </div>
                    <h3 className="text-lg font-heading font-semibold text-foreground">
                      Erro no pagamento
                    </h3>
                    <p className="text-gray-neutral text-sm">
                      Tente novamente ou escolha outro método.
                    </p>
                    <Button 
                      className="mt-2 btn-outline-blue"
                      onClick={() => setPaymentStep('select')}
                    >
                      Tentar novamente
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Checkout;