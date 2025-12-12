import { 
  Users, 
  DollarSign, 
  AlertTriangle,
  TrendingUp,
  Calendar,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import MetricCard from '@/components/MetricCard';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import { useClients } from '@/hooks/useClients';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { usePayments } from '@/hooks/usePayments';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Dashboard = () => {
  const { clients, loading: loadingClients } = useClients();
  const { subscriptions, loading: loadingSubscriptions } = useSubscriptions();
  const { payments, loading: loadingPayments } = usePayments();

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
