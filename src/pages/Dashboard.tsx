import { 
  Users, 
  CreditCard, 
  DollarSign, 
  AlertTriangle,
  TrendingUp,
  Calendar,
  CheckCircle,
  XCircle
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import MetricCard from '@/components/MetricCard';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import { mockDashboardMetrics, mockSubscriptions, mockPayments } from '@/data/mockData';
import { Subscription, Payment } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Dashboard = () => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const recentSubscriptions = mockSubscriptions.slice(0, 5);
  const recentPayments = mockPayments.slice(0, 5);

  const subscriptionColumns = [
    {
      key: 'clientName',
      header: 'Cliente',
      render: (item: Subscription) => (
        <div>
          <span className="font-medium text-foreground text-sm">{item.clientName}</span>
          <span className="block text-xs text-muted-foreground sm:hidden">{item.planName}</span>
        </div>
      ),
    },
    {
      key: 'planName',
      header: 'Plano',
      hideOnMobile: true,
      render: (item: Subscription) => (
        <span className="text-muted-foreground">{item.planName}</span>
      ),
    },
    {
      key: 'value',
      header: 'Valor',
      render: (item: Subscription) => (
        <span className="font-medium text-foreground text-sm">{formatCurrency(item.value)}</span>
      ),
    },
    {
      key: 'nextPayment',
      header: 'Próx. Cobrança',
      hideOnMobile: true,
      render: (item: Subscription) => (
        <span className="text-muted-foreground">
          {format(item.nextPayment, 'dd/MM/yyyy', { locale: ptBR })}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: Subscription) => <StatusBadge status={item.status} />,
    },
  ];

  const paymentColumns = [
    {
      key: 'clientName',
      header: 'Cliente',
      render: (item: Payment) => (
        <span className="font-medium text-foreground text-sm">{item.clientName}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Valor',
      render: (item: Payment) => (
        <span className="font-medium text-foreground text-sm">{formatCurrency(item.amount)}</span>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'Método',
      hideOnMobile: true,
      render: (item: Payment) => (
        <span className="text-muted-foreground">{item.paymentMethod}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Data',
      hideOnMobile: true,
      render: (item: Payment) => (
        <span className="text-muted-foreground">
          {format(item.createdAt, 'dd/MM/yyyy', { locale: ptBR })}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: Payment) => <StatusBadge status={item.status} />,
    },
  ];

  return (
    <DashboardLayout 
      title="Dashboard" 
      subtitle="Visão geral do sistema de assinaturas"
    >
      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 lg:mb-8">
        <MetricCard
          title="Clientes Ativos"
          value={mockDashboardMetrics.activeClients}
          icon={Users}
          trend={{ value: 12, isPositive: true }}
          variant="success"
        />
        <MetricCard
          title="Receita do Mês"
          value={formatCurrency(mockDashboardMetrics.monthlyRevenue)}
          icon={DollarSign}
          trend={{ value: 8, isPositive: true }}
        />
        <MetricCard
          title="Renovadas"
          value={mockDashboardMetrics.renewedSubscriptions}
          icon={CheckCircle}
          variant="success"
        />
        <MetricCard
          title="Falhas"
          value={mockDashboardMetrics.failedPayments}
          icon={AlertTriangle}
          variant="danger"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 lg:mb-8">
        <MetricCard
          title="Total Clientes"
          value={mockDashboardMetrics.totalClients}
          icon={Users}
        />
        <MetricCard
          title="Inativos"
          value={mockDashboardMetrics.inactiveClients}
          icon={XCircle}
          variant="warning"
        />
        <MetricCard
          title="Vencidas"
          value={mockDashboardMetrics.expiredSubscriptions}
          icon={Calendar}
          variant="danger"
        />
        <MetricCard
          title="Próx. Renovações"
          value={mockDashboardMetrics.upcomingRenewals}
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
