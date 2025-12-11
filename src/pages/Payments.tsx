import { useState } from 'react';
import { Search, Filter, MoreHorizontal, CreditCard, CheckCircle, XCircle, Clock } from 'lucide-react';
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
import { mockPayments } from '@/data/mockData';
import { Payment } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Payments = () => {
  const [search, setSearch] = useState('');
  const payments = mockPayments;

  const filteredPayments = payments.filter(payment =>
    payment.clientName.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const totalReceived = payments
    .filter(p => p.status === 'paid')
    .reduce((acc, p) => acc + p.amount, 0);

  const totalPending = payments
    .filter(p => p.status === 'pending')
    .reduce((acc, p) => acc + p.amount, 0);

  const getMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'pix':
        return <div className="w-6 h-6 rounded bg-success/20 flex items-center justify-center text-success text-xs font-bold">PIX</div>;
      case 'cartão de crédito':
        return <CreditCard className="w-5 h-5 text-primary" />;
      default:
        return <CreditCard className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const columns = [
    {
      key: 'client',
      header: 'Cliente',
      render: (item: Payment) => (
        <span className="font-medium text-foreground">{item.clientName}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Valor',
      render: (item: Payment) => (
        <span className="font-semibold text-foreground">{formatCurrency(item.amount)}</span>
      ),
    },
    {
      key: 'method',
      header: 'Método',
      render: (item: Payment) => (
        <div className="flex items-center gap-2">
          {getMethodIcon(item.paymentMethod)}
          <span className="text-muted-foreground">{item.paymentMethod}</span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Criado em',
      render: (item: Payment) => (
        <span className="text-muted-foreground">
          {format(item.createdAt, 'dd/MM/yyyy', { locale: ptBR })}
        </span>
      ),
    },
    {
      key: 'paidAt',
      header: 'Pago em',
      render: (item: Payment) => (
        <span className="text-muted-foreground">
          {item.paidAt 
            ? format(item.paidAt, 'dd/MM/yyyy HH:mm', { locale: ptBR })
            : '-'
          }
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
            {item.status === 'paid' && (
              <DropdownMenuItem className="text-warning">
                Solicitar reembolso
              </DropdownMenuItem>
            )}
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
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-secondary/50 border-border/50 h-11"
          />
        </div>
        
        <Button variant="outline" className="h-11 gap-2 border-border/50 bg-secondary/50">
          <Filter className="w-4 h-4" />
          Filtros
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{payments.length}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-success">{formatCurrency(totalReceived)}</p>
              <p className="text-sm text-muted-foreground">Recebidos</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <Clock className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-warning">{formatCurrency(totalPending)}</p>
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <XCircle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">{payments.filter(p => p.status === 'failed').length}</p>
              <p className="text-sm text-muted-foreground">Falhas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable data={filteredPayments} columns={columns} />
    </DashboardLayout>
  );
};

export default Payments;
