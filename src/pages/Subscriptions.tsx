import { useState } from 'react';
import { Search, Filter, MoreHorizontal, Trash2, Calendar, AlertTriangle, Plus } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSubscriptions, Subscription } from '@/hooks/useSubscriptions';
import { useClients } from '@/hooks/useClients';
import { format, differenceInDays, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const Subscriptions = () => {
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSubscription, setNewSubscription] = useState({
    clientId: '',
    planName: '',
    value: '',
  });

  const { subscriptions, loading, addSubscription, deleteSubscription } = useSubscriptions();
  const { clients } = useClients();

  const filteredSubscriptions = subscriptions.filter(sub =>
    (sub.clients?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    sub.plan_name.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const totalRevenue = subscriptions
    .filter(s => s.status === 'active')
    .reduce((acc, s) => acc + Number(s.value), 0);

  const handleAddSubscription = async () => {
    if (!newSubscription.clientId || !newSubscription.planName || !newSubscription.value) {
      toast.error('Por favor, preencha todos os campos.');
      return;
    }

    const result = await addSubscription({
      client_id: newSubscription.clientId,
      plan_name: newSubscription.planName,
      value: parseFloat(newSubscription.value),
    });

    if (result) {
      setNewSubscription({ clientId: '', planName: '', value: '' });
      setIsDialogOpen(false);
    }
  };

  const handleDeleteSubscription = async (subscriptionId: string) => {
    await deleteSubscription(subscriptionId);
  };

  const getDaysUntilExpiration = (nextPayment: string) => {
    const paymentDate = new Date(nextPayment);
    const today = new Date();
    return differenceInDays(paymentDate, today);
  };

  const getExpirationStatus = (nextPayment: string) => {
    const days = getDaysUntilExpiration(nextPayment);
    const paymentDate = new Date(nextPayment);
    
    if (isPast(paymentDate) && !isToday(paymentDate)) {
      return { label: 'Vencido', color: 'text-destructive', bgColor: 'bg-destructive/10', days: Math.abs(days) };
    }
    if (isToday(paymentDate)) {
      return { label: 'Vence hoje', color: 'text-warning', bgColor: 'bg-warning/10', days: 0 };
    }
    if (days <= 3) {
      return { label: `${days} dias`, color: 'text-warning', bgColor: 'bg-warning/10', days };
    }
    if (days <= 7) {
      return { label: `${days} dias`, color: 'text-orange-500', bgColor: 'bg-orange-500/10', days };
    }
    return { label: `${days} dias`, color: 'text-success', bgColor: 'bg-success/10', days };
  };

  const columns = [
    {
      key: 'client',
      header: 'Cliente',
      render: (item: Subscription) => (
        <div>
          <p className="font-medium text-foreground text-sm">{item.clients?.name || 'N/A'}</p>
          <p className="text-xs text-muted-foreground">{item.plan_name}</p>
        </div>
      ),
    },
    {
      key: 'value',
      header: 'Valor',
      render: (item: Subscription) => (
        <span className="font-semibold text-foreground text-sm">{formatCurrency(Number(item.value))}</span>
      ),
    },
    {
      key: 'nextPayment',
      header: 'Vencimento',
      hideOnMobile: true,
      render: (item: Subscription) => {
        const status = getExpirationStatus(item.next_payment);
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-foreground text-sm font-medium">
                {format(new Date(item.next_payment), 'dd/MM/yyyy', { locale: ptBR })}
              </span>
            </div>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full w-fit ${status.bgColor}`}>
              {status.label === 'Vencido' && <AlertTriangle className="w-3 h-3 text-destructive" />}
              <span className={`text-xs font-medium ${status.color}`}>
                {status.label === 'Vencido' ? `Vencido há ${status.days} dias` : status.label}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: Subscription) => <StatusBadge status={item.status} />,
    },
    {
      key: 'actions',
      header: '',
      render: (item: Subscription) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-card border-border/50">
            <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
            <DropdownMenuItem>Alterar valor</DropdownMenuItem>
            <DropdownMenuItem>Gerar cobrança</DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive"
              onClick={() => handleDeleteSubscription(item.id)}
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
      title="Assinaturas" 
      subtitle="Gerencie as assinaturas e planos dos clientes"
    >
      {/* Header Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 mb-4 sm:mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar assinatura..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-secondary/50 border-border/50 h-10 sm:h-11"
          />
        </div>
        
        <div className="flex gap-2 sm:gap-3">
          <Button variant="outline" size="sm" className="h-10 sm:h-11 gap-2 border-border/50 bg-secondary/50 flex-1 sm:flex-none">
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filtros</span>
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-10 sm:h-11 gap-2 flex-1 sm:flex-none">
                <Plus className="w-4 h-4" />
                <span>Nova</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-border/50 max-w-[95vw] sm:max-w-md mx-auto">
              <DialogHeader>
                <DialogTitle className="font-heading text-xl">Nova Assinatura</DialogTitle>
                <DialogDescription>
                  Crie uma nova assinatura para um cliente.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cliente *</label>
                  <Select
                    value={newSubscription.clientId}
                    onValueChange={(value) => setNewSubscription({ ...newSubscription, clientId: value })}
                  >
                    <SelectTrigger className="bg-secondary/50 border-border/50">
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-border/50">
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome do Plano *</label>
                  <Input
                    placeholder="Ex: Plano Empresarial"
                    value={newSubscription.planName}
                    onChange={(e) => setNewSubscription({ ...newSubscription, planName: e.target.value })}
                    className="bg-secondary/50 border-border/50"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Valor Mensal (R$) *</label>
                  <Input
                    type="number"
                    placeholder="299.90"
                    value={newSubscription.value}
                    onChange={(e) => setNewSubscription({ ...newSubscription, value: e.target.value })}
                    className="bg-secondary/50 border-border/50"
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    className="flex-1 border-border/50"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button className="flex-1" onClick={handleAddSubscription}>
                    Criar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div className="glass-card p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-2xl font-bold text-foreground">{subscriptions.length}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Total</p>
        </div>
        <div className="glass-card p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-2xl font-bold text-success">{subscriptions.filter(s => s.status === 'active').length}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Ativas</p>
        </div>
        <div className="glass-card p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-2xl font-bold text-warning">{subscriptions.filter(s => s.status === 'pending').length}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Pendentes</p>
        </div>
        <div className="glass-card p-3 sm:p-4 text-center">
          <p className="text-lg sm:text-xl font-bold text-primary">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Receita/Mês</p>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="glass-card p-8 text-center">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      ) : (
        <DataTable data={filteredSubscriptions} columns={columns} />
      )}
    </DashboardLayout>
  );
};

export default Subscriptions;
