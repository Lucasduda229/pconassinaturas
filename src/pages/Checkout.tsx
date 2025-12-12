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
  Sparkles,
  Shield,
  Zap
} from 'lucide-react';
import logo from '@/assets/logo-pcon.png';
import FuturisticBackground from '@/components/FuturisticBackground';

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

  const handlePayment = async (method: 'PIX' | 'CREDIT_CARD') => {
    if (!client || !subscription) return;
    
    setPaymentMethod(method);
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
        }
        setIsPaymentDialogOpen(true);
      } else if (method === 'CREDIT_CARD') {
        if (paymentResult.invoiceUrl) {
          window.open(paymentResult.invoiceUrl, '_blank');
          toast.success('Redirecionando para pagamento com cartão...');
        }
      }

      toast.success('Cobrança criada com sucesso!');
    } catch (error: any) {
      console.error('Payment error:', error);
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
        <FuturisticBackground />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10"
        >
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <FuturisticBackground />
      
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-20 glass-card border-b border-border/30 sticky top-0"
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <motion.div
                className="absolute inset-0 blur-xl opacity-50"
                style={{
                  background: 'linear-gradient(135deg, hsl(220 70% 55%), hsl(280 75% 45%))',
                }}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.35, 0.55, 0.35],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <img src={logo} alt="Logo" className="h-12 w-auto relative z-10" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              Olá, <span className="text-foreground font-medium">{client?.name?.split(' ')[0]}</span>
            </span>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="btn-premium-outline"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-8 sm:py-12 max-w-2xl">
        <div className="space-y-8">
          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="text-center"
          >
            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-gradient-light mb-3">
              Minha Assinatura
            </h1>
            <p className="text-muted-foreground">
              Gerencie sua assinatura e realize pagamentos com segurança
            </p>
          </motion.div>

          {/* Subscription Card */}
          {subscription ? (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.7 }}
              className="glass-card-premium p-6 sm:p-8"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-heading font-bold text-foreground mb-2">
                    {subscription.plan_name}
                  </h2>
                  <p className="text-muted-foreground text-sm">Detalhes da sua assinatura</p>
                </div>
                <Badge 
                  className={`${getStatusConfig(subscription.status).className} flex items-center gap-1.5 px-3 py-1 border rounded-full`}
                >
                  {getStatusConfig(subscription.status).icon}
                  {getStatusConfig(subscription.status).label}
                </Badge>
              </div>

              {/* Info Grid */}
              <div className="grid gap-4 sm:grid-cols-2 mb-8">
                <motion.div 
                  className="glass-card p-5 flex items-center gap-4"
                  whileHover={{ scale: 1.02, y: -2 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Mensal</p>
                    <p className="text-2xl font-bold text-foreground">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(subscription.value))}
                    </p>
                  </div>
                </motion.div>

                <motion.div 
                  className="glass-card p-5 flex items-center gap-4"
                  whileHover={{ scale: 1.02, y: -2 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Próximo Vencimento</p>
                    <p className="text-xl font-bold text-foreground">
                      {format(new Date(subscription.next_payment), "dd 'de' MMM", { locale: ptBR })}
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-8" />

              {/* Payment Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-foreground">Realizar Pagamento</h3>
                    <p className="text-sm text-muted-foreground">Escolha sua forma de pagamento</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <motion.div whileHover={{ scale: 1.03, y: -3 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      size="lg"
                      className="w-full h-auto py-6 btn-premium flex-col gap-3"
                      onClick={() => handlePayment('PIX')}
                      disabled={isProcessing || asaasLoading}
                    >
                      <span className="relative z-10 flex flex-col items-center gap-2">
                        {isProcessing && paymentMethod === 'PIX' ? (
                          <Loader2 className="h-8 w-8 animate-spin" />
                        ) : (
                          <QrCode className="h-8 w-8" />
                        )}
                        <span className="text-base font-semibold">Pagar com PIX</span>
                        <span className="text-xs opacity-80 font-normal">Aprovação instantânea</span>
                      </span>
                    </Button>
                  </motion.div>

                  <motion.div whileHover={{ scale: 1.03, y: -3 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      size="lg"
                      className="w-full h-auto py-6 btn-premium-outline flex-col gap-3"
                      onClick={() => handlePayment('CREDIT_CARD')}
                      disabled={isProcessing || asaasLoading}
                    >
                      {isProcessing && paymentMethod === 'CREDIT_CARD' ? (
                        <Loader2 className="h-8 w-8 animate-spin" />
                      ) : (
                        <CreditCard className="h-8 w-8" />
                      )}
                      <span className="text-base font-semibold">Cartão de Crédito</span>
                      <span className="text-xs opacity-80 font-normal">Parcele em até 12x</span>
                    </Button>
                  </motion.div>
                </div>
              </div>

              {/* Security Badge */}
              <motion.div 
                className="mt-8 flex items-center justify-center gap-2 text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
              >
                <Shield className="h-4 w-4" />
                <span className="text-xs">Pagamento 100% seguro e criptografado</span>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
              className="glass-card-premium p-12 text-center"
            >
              <AlertCircle className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
              <h3 className="text-xl font-heading font-semibold mb-3">Nenhuma assinatura ativa</h3>
              <p className="text-muted-foreground">
                Você não possui uma assinatura ativa no momento.
              </p>
            </motion.div>
          )}
        </div>
      </main>

      {/* PIX Payment Dialog */}
      <AnimatePresence>
        {isPaymentDialogOpen && (
          <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
            <DialogContent className="glass-card-premium border-border/30 sm:max-w-md p-0 overflow-hidden">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="p-6 sm:p-8"
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/20 flex items-center justify-center">
                    <QrCode className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-heading font-bold text-foreground mb-2">
                    Pagamento PIX
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Escaneie o QR Code ou copie o código
                  </p>
                </div>

                {pixData?.qrCode && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex justify-center p-6 bg-white rounded-2xl mb-6"
                  >
                    <img 
                      src={`data:image/png;base64,${pixData.qrCode}`} 
                      alt="QR Code PIX" 
                      className="w-48 h-48"
                    />
                  </motion.div>
                )}

                {pixData?.copyPaste && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-3"
                  >
                    <p className="text-sm text-muted-foreground text-center">
                      Ou copie o código PIX:
                    </p>
                    <div className="flex gap-2">
                      <code className="flex-1 p-3 bg-secondary/50 rounded-xl text-xs break-all max-h-20 overflow-y-auto border border-border/30">
                        {pixData.copyPaste}
                      </code>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button 
                          size="icon" 
                          className="btn-premium h-12 w-12"
                          onClick={copyPixCode}
                        >
                          <Copy className="h-5 w-5 relative z-10" />
                        </Button>
                      </motion.div>
                    </div>
                  </motion.div>
                )}

                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-6 flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20"
                >
                  <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
                  <p className="text-xs text-foreground/80">
                    Após o pagamento, a confirmação será automática em poucos minutos.
                  </p>
                </motion.div>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Checkout;