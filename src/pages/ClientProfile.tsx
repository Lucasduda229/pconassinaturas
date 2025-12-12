import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, FileText, CreditCard, Calendar, User, Loader2 } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  document: string | null;
  status: string;
  created_at: string;
}

interface Subscription {
  id: string;
  plan_name: string;
  value: number;
  status: string;
  start_date: string;
  next_payment: string;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  payment_method: string | null;
  created_at: string;
  paid_at: string | null;
  subscription: {
    plan_name: string;
  } | null;
}

const ClientProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);
      
      // Fetch client
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (clientData) {
        setClient(clientData);
      }

      // Check if client has access
      const { data: accessData } = await supabase
        .from('client_users')
        .select('id')
        .eq('client_id', id)
        .maybeSingle();
      
      setHasAccess(!!accessData);

      // Fetch subscriptions
      const { data: subsData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('client_id', id)
        .order('created_at', { ascending: false });
      
      if (subsData) {
        setSubscriptions(subsData);
      }

      // Fetch payments through subscriptions
      if (subsData && subsData.length > 0) {
        const subscriptionIds = subsData.map(s => s.id);
        const { data: paymentsData } = await supabase
          .from('payments')
          .select(`
            *,
            subscription:subscriptions(plan_name)
          `)
          .in('subscription_id', subscriptionIds)
          .order('created_at', { ascending: false });
        
        if (paymentsData) {
          setPayments(paymentsData as Payment[]);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [id]);

  const stats = useMemo(() => {
    const totalSubscriptions = subscriptions.length;
    const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;
    const totalPayments = payments.length;
    const paidPayments = payments.filter(p => p.status === 'paid').length;
    const totalRevenue = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    return { totalSubscriptions, activeSubscriptions, totalPayments, paidPayments, totalRevenue };
  }, [subscriptions, payments]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <DashboardLayout title="Carregando..." subtitle="Buscando dados do cliente">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!client) {
    return (
      <DashboardLayout title="Cliente não encontrado" subtitle="O cliente solicitado não existe">
        <Button onClick={() => navigate('/clients')} variant="outline" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title={client.name} 
      subtitle="Perfil completo do cliente"
      headerAction={
        <Button onClick={() => navigate('/clients')} variant="outline" size="sm" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Voltar</span>
        </Button>
      }
    >
      {/* Client Info Card */}
      <Card className="glass-card border-border/50 mb-6">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-semibold text-foreground truncate">{client.name}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <StatusBadge status={client.status} />
                  {hasAccess && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success">
                      Acesso checkout
                    </span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:gap-4 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-4 h-4 flex-shrink-0" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                </div>
                {client.document && (
                  <p className="text-sm text-muted-foreground mt-1">
                    <FileText className="w-4 h-4 inline mr-1" />
                    {client.document}
                  </p>
                )}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 inline mr-1" />
              Cliente desde {format(new Date(client.created_at), "dd/MM/yyyy", { locale: ptBR })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-6">
        <Card className="glass-card border-border/50">
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.activeSubscriptions}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Assinaturas Ativas</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-border/50">
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.totalPayments}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Pagamentos</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-border/50">
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-xl sm:text-2xl font-bold text-success">{stats.paidPayments}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Pagos</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-border/50">
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-lg sm:text-xl font-bold text-primary">{formatCurrency(stats.totalRevenue)}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Total Recebido</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="subscriptions" className="w-full">
        <TabsList className="w-full sm:w-auto glass-card border-border/50 mb-4">
          <TabsTrigger value="subscriptions" className="flex-1 sm:flex-none gap-2">
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">Assinaturas</span>
            <span className="sm:hidden">Planos</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex-1 sm:flex-none gap-2">
            <FileText className="w-4 h-4" />
            <span>Pagamentos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions">
          <Card className="glass-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Assinaturas ({subscriptions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhuma assinatura encontrada</p>
              ) : (
                <div className="space-y-3">
                  {subscriptions.map((sub) => (
                    <div 
                      key={sub.id} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-secondary/30 gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{sub.plan_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Início: {format(new Date(sub.start_date), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-primary">{formatCurrency(Number(sub.value))}</p>
                          <p className="text-xs text-muted-foreground">
                            Próx: {format(new Date(sub.next_payment), "dd/MM", { locale: ptBR })}
                          </p>
                        </div>
                        <StatusBadge status={sub.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card className="glass-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Histórico de Pagamentos ({payments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhum pagamento encontrado</p>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div 
                      key={payment.id} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-secondary/30 gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {payment.subscription?.plan_name || 'Pagamento avulso'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(payment.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                        {payment.payment_method && (
                          <p className="text-xs text-muted-foreground uppercase">{payment.payment_method}</p>
                        )}
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                        <p className="font-semibold text-primary">{formatCurrency(Number(payment.amount))}</p>
                        <StatusBadge status={payment.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default ClientProfile;
