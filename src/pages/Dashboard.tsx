import { useState } from 'react';
import { 
  Users, 
  DollarSign, 
  AlertTriangle,
  TrendingUp,
  Calendar,
  CheckCircle,
  XCircle,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import MetricCard from '@/components/MetricCard';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useClients } from '@/hooks/useClients';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { usePayments } from '@/hooks/usePayments';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const Dashboard = () => {
  const [isResetting, setIsResetting] = useState(false);
  const { clients, loading: loadingClients, refetch: refetchClients } = useClients();
  const { subscriptions, loading: loadingSubscriptions, refetch: refetchSubscriptions } = useSubscriptions();
  const { payments, loading: loadingPayments, refetch: refetchPayments } = usePayments();

  const handleResetAllData = async () => {
    setIsResetting(true);
    try {
      // Delete in order due to foreign key constraints
      const { error: paymentsError } = await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (paymentsError) throw paymentsError;

      const { error: invoicesError } = await supabase.from('invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (invoicesError) throw invoicesError;

      const { error: notificationsError } = await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (notificationsError) throw notificationsError;

      const { error: subscriptionsError } = await supabase.from('subscriptions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (subscriptionsError) throw subscriptionsError;

      const { error: clientSessionsError } = await supabase.from('client_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (clientSessionsError) throw clientSessionsError;

      const { error: clientUsersError } = await supabase.from('client_users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (clientUsersError) throw clientUsersError;

      const { error: clientsError } = await supabase.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (clientsError) throw clientsError;

      // Refetch all data
      await Promise.all([refetchClients(), refetchSubscriptions(), refetchPayments()]);

      toast.success('Todos os dados foram removidos com sucesso!');
    } catch (error) {
      console.error('Error resetting data:', error);
      toast.error('Erro ao resetar dados. Tente novamente.');
    } finally {
      setIsResetting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Calculate real metrics from database
  const activeClients = clients.filter(c => c.status === 'active').length;
  const inactiveClients = clients.filter(c => c.status === 'inactive').length;
  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  const monthlyRevenue = activeSubscriptions.reduce((acc, sub) => acc + sub.value, 0);
  const renewedSubscriptions = subscriptions.filter(s => s.status === 'active').length;
  const expiredSubscriptions = subscriptions.filter(s => s.status === 'overdue' || s.status === 'cancelled').length;
  const pendingSubscriptions = subscriptions.filter(s => s.status === 'pending').length;
  const failedPayments = payments.filter(p => p.status === 'failed').length;

  const recentSubscriptions = subscriptions.slice(0, 5);
  const recentPayments = payments.slice(0, 5);

  const subscriptionColumns = [
    {
      key: 'clientName',
      header: 'Cliente',
      render: (item: any) => (
        <div>
          <span className="font-medium text-foreground text-sm">{item.clientName || 'N/A'}</span>
          <span className="block text-xs text-muted-foreground sm:hidden">{item.plan_name}</span>
        </div>
      ),
    },
    {
      key: 'planName',
      header: 'Plano',
      hideOnMobile: true,
      render: (item: any) => (
        <span className="text-muted-foreground">{item.plan_name}</span>
      ),
    },
    {
      key: 'value',
      header: 'Valor',
      render: (item: any) => (
        <span className="font-medium text-foreground text-sm">{formatCurrency(item.value)}</span>
      ),
    },
    {
      key: 'nextPayment',
      header: 'Próx. Cobrança',
      hideOnMobile: true,
      render: (item: any) => (
        <span className="text-muted-foreground">
          {format(new Date(item.next_payment), 'dd/MM/yyyy', { locale: ptBR })}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: any) => <StatusBadge status={item.status} />,
    },
  ];

  const paymentColumns = [
    {
      key: 'clientName',
      header: 'Cliente',
      render: (item: any) => (
        <span className="font-medium text-foreground text-sm">{item.clientName || 'N/A'}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Valor',
      render: (item: any) => (
        <span className="font-medium text-foreground text-sm">{formatCurrency(item.amount)}</span>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'Método',
      hideOnMobile: true,
      render: (item: any) => (
        <span className="text-muted-foreground">{item.payment_method || '-'}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Data',
      hideOnMobile: true,
      render: (item: any) => (
        <span className="text-muted-foreground">
          {format(new Date(item.created_at), 'dd/MM/yyyy', { locale: ptBR })}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: any) => <StatusBadge status={item.status} />,
    },
  ];

  const isLoading = loadingClients || loadingSubscriptions || loadingPayments;

  return (
    <DashboardLayout 
      title="Dashboard" 
      subtitle="Visão geral do sistema de assinaturas"
      headerAction={
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
              disabled={isResetting}
            >
              {isResetting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Resetar Dados</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="glass-card border-border/50">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">Resetar Todos os Dados?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação irá <strong>apagar permanentemente</strong> todos os clientes, assinaturas, pagamentos e notificações do sistema. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border/50">Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleResetAllData}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Sim, apagar tudo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      }
    >
      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 lg:mb-8">
        <MetricCard
          title="Clientes Ativos"
          value={isLoading ? '...' : activeClients}
          icon={Users}
          variant="success"
        />
        <MetricCard
          title="Receita do Mês"
          value={isLoading ? '...' : formatCurrency(monthlyRevenue)}
          icon={DollarSign}
        />
        <MetricCard
          title="Renovadas"
          value={isLoading ? '...' : renewedSubscriptions}
          icon={CheckCircle}
          variant="success"
        />
        <MetricCard
          title="Falhas"
          value={isLoading ? '...' : failedPayments}
          icon={AlertTriangle}
          variant="danger"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 lg:mb-8">
        <MetricCard
          title="Total Clientes"
          value={isLoading ? '...' : clients.length}
          icon={Users}
        />
        <MetricCard
          title="Inativos"
          value={isLoading ? '...' : inactiveClients}
          icon={XCircle}
          variant="warning"
        />
        <MetricCard
          title="Vencidas"
          value={isLoading ? '...' : expiredSubscriptions}
          icon={Calendar}
          variant="danger"
        />
        <MetricCard
          title="Pendentes"
          value={isLoading ? '...' : pendingSubscriptions}
          icon={TrendingUp}
        />
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
        <div>
          <h2 className="font-heading text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4">
            Assinaturas Recentes
          </h2>
          <DataTable 
            data={recentSubscriptions} 
            columns={subscriptionColumns}
          />
        </div>
        
        <div>
          <h2 className="font-heading text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4">
            Últimos Pagamentos
          </h2>
          <DataTable 
            data={recentPayments} 
            columns={paymentColumns}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
