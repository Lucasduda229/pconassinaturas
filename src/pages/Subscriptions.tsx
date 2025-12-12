import { useState } from 'react';
import { Plus, Search, Filter, MoreHorizontal, Calendar, DollarSign, Trash2 } from 'lucide-react';
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
import { mockSubscriptions, mockClients } from '@/data/mockData';
import { Subscription } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const Subscriptions = () => {
  const [search, setSearch] = useState('');
  const [subscriptions, setSubscriptions] = useState(mockSubscriptions);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSubscription, setNewSubscription] = useState({
    clientId: '',
    planName: '',
    value: '',
  });

  const filteredSubscriptions = subscriptions.filter(sub =>
    sub.clientName.toLowerCase().includes(search.toLowerCase()) ||
    sub.planName.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const totalRevenue = subscriptions
    .filter(s => s.status === 'active')
    .reduce((acc, s) => acc + s.value, 0);

  const handleAddSubscription = () => {
    if (!newSubscription.clientId || !newSubscription.planName || !newSubscription.value) {
      toast.error('Por favor, preencha todos os campos.');
      return;
    }

    const client = mockClients.find(c => c.id === newSubscription.clientId);
    if (!client) return;

    const subscription: Subscription = {
      id: String(subscriptions.length + 1),
      clientId: newSubscription.clientId,
      clientName: client.name,
      planName: newSubscription.planName,
      value: parseFloat(newSubscription.value),
      status: 'active',
      startDate: new Date(),
      nextPayment: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };

    setSubscriptions([...subscriptions, subscription]);
    setNewSubscription({ clientId: '', planName: '', value: '' });
    setIsDialogOpen(false);
    toast.success('Assinatura criada com sucesso!');
  };

  const handleDeleteSubscription = (subscriptionId: string) => {
    setSubscriptions(subscriptions.filter(s => s.id !== subscriptionId));
    toast.success('Assinatura removida com sucesso!');
  };

  const columns = [
    {
      key: 'client',
      header: 'Cliente',
      render: (item: Subscription) => (
        <div>
          <p className="font-medium text-foreground text-sm">{item.clientName}</p>
          <p className="text-xs text-muted-foreground">{item.planName}</p>
        </div>
      ),
    },
    {
      key: 'value',
      header: 'Valor',
      render: (item: Subscription) => (
        <span className="font-semibold text-foreground text-sm">{formatCurrency(item.value)}</span>
      ),
    },
    {
      key: 'nextPayment',
      header: 'Próx. Cobrança',
      hideOnMobile: true,
      render: (item: Subscription) => (
        <span className="text-muted-foreground text-sm">
          {format(item.nextPayment, 'dd/MM/yyyy', { locale: ptBR })}
        </span>
      ),
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
                      {mockClients.map((client) => (
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
      <DataTable data={filteredSubscriptions} columns={columns} />
    </DashboardLayout>
  );
};

export default Subscriptions;
