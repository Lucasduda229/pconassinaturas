import { useState } from 'react';
import { Search, Filter, MoreHorizontal, CreditCard, CheckCircle, XCircle, Clock, Trash2, Download } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePayments, Payment } from '@/hooks/usePayments';
import { formatBrazilDate } from '@/utils/dateUtils';
import { toast } from 'sonner';
import { exportToCSV, formatCurrencyForExport, formatDateForExport } from '@/utils/exportUtils';

const Payments = () => {
  const [search, setSearch] = useState('');
  const { payments, loading, deletePayment } = usePayments();

  const filteredPayments = payments.filter(payment =>
    (payment.subscriptions?.clients?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const totalReceived = payments
    .filter(p => p.status === 'paid')
    .reduce((acc, p) => acc + Number(p.amount), 0);

  const totalPending = payments
    .filter(p => p.status === 'pending')
    .reduce((acc, p) => acc + Number(p.amount), 0);

  const handleDeletePayment = async (paymentId: string) => {
    await deletePayment(paymentId);
  };

  const columns = [
    {
      key: 'client',
      header: 'Cliente',
      render: (item: Payment) => (
        <div>
          <span className="font-medium text-foreground text-sm">{item.subscriptions?.clients?.name || 'N/A'}</span>
          <span className="block text-xs text-muted-foreground sm:hidden">{item.payment_method}</span>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Valor',
      render: (item: Payment) => (
        <span className="font-semibold text-foreground text-sm">{formatCurrency(Number(item.amount))}</span>
      ),
    },
    {
      key: 'method',
      header: 'Método',
      hideOnMobile: true,
      render: (item: Payment) => (
        <span className="text-muted-foreground">{item.payment_method || 'N/A'}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Data',
      hideOnMobile: true,
      render: (item: Payment) => (
        <span className="text-muted-foreground">
          {formatBrazilDate(item.created_at)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: Payment) => <StatusBadge status={item.status} />,
    },
    {
      key: 'actions',
      header: '',
      render: (item: Payment) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-card border-border/50">
            <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
            <DropdownMenuItem>Emitir nota fiscal</DropdownMenuItem>
            <DropdownMenuItem>Reenviar cobrança</DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive"
              onClick={() => handleDeletePayment(item.id)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <DashboardLayout 
      title="Pagamentos" 
      subtitle="Acompanhe todos os pagamentos e cobranças"
    >
      {/* Header Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 mb-4 sm:mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar pagamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-secondary/50 border-border/50 h-10 sm:h-11"
          />
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="h-10 sm:h-11 gap-2 border-border/50 bg-secondary/50"
          onClick={() => {
            const exportData = payments.map(p => ({
              ...p,
              clientName: p.subscriptions?.clients?.name || 'N/A',
              formattedAmount: formatCurrencyForExport(Number(p.amount)),
              formattedDate: formatDateForExport(p.created_at),
            }));
            exportToCSV(exportData, 'pagamentos', [
              { key: 'clientName', label: 'Cliente' },
              { key: 'formattedAmount', label: 'Valor' },
              { key: 'payment_method', label: 'Método' },
              { key: 'status', label: 'Status' },
              { key: 'formattedDate', label: 'Data' },
            ]);
            toast.success('Exportação concluída!');
          }}
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Exportar</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div className="glass-card p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold text-foreground">{payments.length}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Total</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-success/10">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
            </div>
            <div>
              <p className="text-sm sm:text-xl font-bold text-success">{formatCurrency(totalReceived)}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Recebidos</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-warning/10">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-warning" />
            </div>
            <div>
              <p className="text-sm sm:text-xl font-bold text-warning">{formatCurrency(totalPending)}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Pendentes</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-destructive/10">
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold text-destructive">{payments.filter(p => p.status === 'failed').length}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Falhas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="glass-card p-8 text-center">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      ) : (
        <DataTable data={filteredPayments} columns={columns} />
      )}
    </DashboardLayout>
  );
};

export default Payments;
