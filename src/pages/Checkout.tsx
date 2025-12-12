import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useAsaas } from '@/hooks/useAsaas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  Clock,
  Copy,
  ExternalLink
} from 'lucide-react';
import logo from '@/assets/logo-pcon.png';

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
      // First create/sync customer in ASAAS
      const customerResult = await createCustomer({
        name: client.name,
        email: client.email,
        cpfCnpj: client.document || undefined,
        phone: client.phone || undefined,
      });

      if (!customerResult?.id) {
        throw new Error('Erro ao criar cliente no gateway de pagamento');
      }

      // Create payment
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
        // Get PIX QR Code
        const pixResult = await getPixQrCode(paymentResult.id);
        if (pixResult) {
          setPixData({
            qrCode: pixResult.encodedImage,
            copyPaste: pixResult.payload,
          });
        }
        setIsPaymentDialogOpen(true);
      } else if (method === 'CREDIT_CARD') {
        // Redirect to ASAAS checkout
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      active: { label: 'Ativa', variant: 'default' },
      pending: { label: 'Pendente', variant: 'secondary' },
      cancelled: { label: 'Cancelada', variant: 'destructive' },
      overdue: { label: 'Vencida', variant: 'destructive' },
    };
    
    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-10 w-auto" />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              Olá, {client?.name?.split(' ')[0]}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          {/* Welcome Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                Minha Assinatura
              </CardTitle>
              <CardDescription>
                Gerencie sua assinatura e realize pagamentos
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Subscription Details */}
          {subscription ? (
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{subscription.plan_name}</CardTitle>
                    <CardDescription>Detalhes da sua assinatura</CardDescription>
                  </div>
                  {getStatusBadge(subscription.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Valor</p>
                      <p className="text-lg font-semibold">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(subscription.value))}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Próximo vencimento</p>
                      <p className="text-lg font-semibold">
                        {format(new Date(subscription.next_payment), "dd 'de' MMM, yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Payment Options */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Realizar Pagamento
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button
                      size="lg"
                      className="h-auto py-4 flex-col gap-2"
                      onClick={() => handlePayment('PIX')}
                      disabled={isProcessing || asaasLoading}
                    >
                      {isProcessing && paymentMethod === 'PIX' ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <QrCode className="h-6 w-6" />
                      )}
                      <span>Pagar com PIX</span>
                      <span className="text-xs opacity-80">Aprovação instantânea</span>
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-auto py-4 flex-col gap-2"
                      onClick={() => handlePayment('CREDIT_CARD')}
                      disabled={isProcessing || asaasLoading}
                    >
                      {isProcessing && paymentMethod === 'CREDIT_CARD' ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <CreditCard className="h-6 w-6" />
                      )}
                      <span>Cartão de Crédito</span>
                      <span className="text-xs opacity-80">Parcele em até 12x</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma assinatura ativa</h3>
                <p className="text-muted-foreground">
                  Você não possui uma assinatura ativa no momento.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* PIX Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Pagamento PIX
            </DialogTitle>
            <DialogDescription>
              Escaneie o QR Code ou copie o código para realizar o pagamento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {pixData?.qrCode && (
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img 
                  src={`data:image/png;base64,${pixData.qrCode}`} 
                  alt="QR Code PIX" 
                  className="w-48 h-48"
                />
              </div>
            )}
            {pixData?.copyPaste && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center">
                  Ou copie o código PIX:
                </p>
                <div className="flex gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-xs break-all max-h-20 overflow-y-auto">
                    {pixData.copyPaste}
                  </code>
                  <Button size="icon" variant="outline" onClick={copyPixCode}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
              <AlertCircle className="h-4 w-4 text-primary flex-shrink-0" />
              <p className="text-xs text-primary">
                Após o pagamento, a confirmação pode levar alguns minutos.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Checkout;
