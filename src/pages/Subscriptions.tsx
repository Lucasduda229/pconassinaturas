import { useState } from 'react';
import { Search, Filter, MoreHorizontal, Trash2, Calendar, AlertTriangle, Plus, Pencil, CreditCard, Loader2, Receipt, QrCode, FileText, MessageCircle } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGlobalData, Subscription } from '@/contexts/GlobalDataContext';
import { useAsaas } from '@/hooks/useAsaas';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, isPast, isToday, format, addDays } from 'date-fns';
import { formatBrazilDate, formatDateForInput, inputDateToISO, toBrazilTime } from '@/utils/dateUtils';
import { toast } from 'sonner';
import { useWhatsAppReminder } from '@/hooks/useWhatsAppReminder';

const Subscriptions = () => {
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [generatingChargeId, setGeneratingChargeId] = useState<string | null>(null);
  const [newSubscription, setNewSubscription] = useState({
    clientId: '',
    planName: '',
    value: '',
    dueDate: '',
  });
  const [newCharge, setNewCharge] = useState({
    clientId: '',
    value: '',
    description: '',
    dueDate: '',
    billingType: 'PIX' as 'PIX' | 'CREDIT_CARD',
  });
  const [isCreatingCharge, setIsCreatingCharge] = useState(false);

  const { subscriptions, clients, loadingSubscriptions: loading, addSubscription, updateSubscription, deleteSubscription } = useGlobalData();
  const { createPayment, createCustomer, syncCustomerToAsaas, createSubscription: createAsaasSubscription, loading: asaasLoading } = useAsaas();
  const { sendReminder, sendingReminderId } = useWhatsAppReminder();

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
    if (!newSubscription.clientId || !newSubscription.planName || !newSubscription.value || !newSubscription.dueDate) {
      toast.error('Por favor, preencha todos os campos.');
      return;
    }

    try {
      // First, sync the client with Asaas
      const customerResult = await syncCustomerToAsaas(newSubscription.clientId);
      const asaasCustomerId = customerResult?.id;

      if (!asaasCustomerId) {
        toast.error('Erro ao sincronizar cliente com Asaas');
        return;
      }

      // Create subscription in Asaas
      const asaasSubscription = await createAsaasSubscription({
        customer: asaasCustomerId,
        billingType: 'PIX',
        value: parseFloat(newSubscription.value),
        nextDueDate: newSubscription.dueDate,
        cycle: 'MONTHLY',
        description: newSubscription.planName,
      });

      if (!asaasSubscription?.id) {
        toast.error('Erro ao criar assinatura no Asaas');
        return;
      }

      // Save locally with Asaas ID
      const result = await addSubscription({
        client_id: newSubscription.clientId,
        plan_name: newSubscription.planName,
        value: parseFloat(newSubscription.value),
        next_payment: inputDateToISO(newSubscription.dueDate),
        asaas_id: asaasSubscription.id,
        status: 'active',
      });

      if (result) {
        toast.success('Assinatura criada e sincronizada com Asaas!');
        setNewSubscription({ clientId: '', planName: '', value: '', dueDate: '' });
        setIsDialogOpen(false);
      }
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      toast.error(error.message || 'Erro ao criar assinatura');
    }
  };

  const handleCreateSingleCharge = async () => {
    if (!newCharge.clientId || !newCharge.value || !newCharge.dueDate) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const selectedClient = clients.find(c => c.id === newCharge.clientId);
    if (!selectedClient) {
      toast.error('Cliente não encontrado');
      return;
    }

    setIsCreatingCharge(true);
    try {
      // First sync client with ASAAS
      const customer = await createCustomer({
        name: selectedClient.name,
        email: selectedClient.email,
        cpfCnpj: selectedClient.document?.replace(/[^\d]/g, '') || '',
        phone: selectedClient.phone?.replace(/[^\d]/g, '') || undefined,
      });

      if (!customer?.id) {
        toast.error('Erro ao criar/buscar cliente na ASAAS');
        return;
      }

      // Create the payment in ASAAS
      const asaasPayment = await createPayment({
        customer: customer.id,
        billingType: newCharge.billingType,
        value: parseFloat(newCharge.value),
        dueDate: newCharge.dueDate,
        description: newCharge.description || `Cobrança para ${selectedClient.name}`,
      });

      if (asaasPayment) {
        // Save the payment to local database
        const { error } = await supabase
          .from('payments')
          .insert({
            client_id: newCharge.clientId,
            amount: parseFloat(newCharge.value),
            status: 'pending',
            payment_method: newCharge.billingType,
            description: newCharge.description || `Cobrança única para ${selectedClient.name}`,
            asaas_id: asaasPayment.id,
          });

        if (error) {
          console.error('Error saving payment locally:', error);
        }

        toast.success('Cobrança criada com sucesso!');
        setIsDialogOpen(false);
        setNewCharge({ clientId: '', value: '', description: '', dueDate: '', billingType: 'PIX' });
      }
    } catch (error) {
      toast.error('Erro ao criar cobrança');
    } finally {
      setIsCreatingCharge(false);
    }
  };

  const openEditDialog = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setIsEditDialogOpen(true);
  };

  const handleUpdateSubscription = async () => {
    if (!editingSubscription) return;

    const result = await updateSubscription(editingSubscription.id, {
      plan_name: editingSubscription.plan_name,
      value: editingSubscription.value,
      status: editingSubscription.status,
      next_payment: editingSubscription.next_payment,
    });

    if (result) {
      setIsEditDialogOpen(false);
      setEditingSubscription(null);
    }
  };

  const handleDeleteSubscription = async (subscriptionId: string) => {
    await deleteSubscription(subscriptionId);
  };

  const handleGenerateCharge = async (subscription: Subscription) => {
    if (!subscription.clients) {
      toast.error('Cliente não encontrado para esta assinatura.');
      return;
    }

    setGeneratingChargeId(subscription.id);

    try {
      // First, sync customer to Asaas (creates if not exists)
      const customerResult = await syncCustomerToAsaas(subscription.client_id);
      
      // The API returns 'id' not 'asaasCustomerId'
      const asaasCustomerId = customerResult?.id;
      
      if (!asaasCustomerId) {
        throw new Error('Não foi possível sincronizar o cliente com a Asaas.');
      }

      // Calculate due date (use next_payment or 3 days from now if past)
      const nextPaymentDate = new Date(subscription.next_payment);
      const dueDate = isPast(nextPaymentDate) ? addDays(new Date(), 3) : nextPaymentDate;

      // Create payment in Asaas
      const paymentResult = await createPayment({
        customer: asaasCustomerId,
        billingType: 'PIX', // Default to PIX
        value: Number(subscription.value),
        dueDate: format(dueDate, 'yyyy-MM-dd'),
        description: `Cobrança - ${subscription.plan_name}`,
        externalReference: subscription.id,
      });

      if (paymentResult) {
        toast.success('Cobrança criada com sucesso! O cliente será notificado por email.');
        
        // Update subscription next_payment to next month
        const newNextPayment = new Date(dueDate);
        newNextPayment.setMonth(newNextPayment.getMonth() + 1);
        
        await updateSubscription(subscription.id, {
          next_payment: newNextPayment.toISOString(),
        });
      }
    } catch (error: any) {
      console.error('Error generating charge:', error);
      toast.error(error.message || 'Erro ao gerar cobrança.');
    } finally {
      setGeneratingChargeId(null);
    }
  };

  const openDetailsDialog = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setIsDetailsDialogOpen(true);
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
                {formatBrazilDate(item.next_payment)}
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
            <DropdownMenuItem onClick={() => openDetailsDialog(item)}>
              <Search className="w-4 h-4 mr-2" />
              Ver detalhes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEditDialog(item)}>
              <Pencil className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleGenerateCharge(item)}
              disabled={generatingChargeId === item.id}
            >
              {generatingChargeId === item.id ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4 mr-2" />
              )}
              {generatingChargeId === item.id ? 'Gerando...' : 'Gerar cobrança'}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => sendReminder({
                clientId: item.client_id,
                clientName: item.clients?.name || 'Cliente',
                clientPhone: item.clients?.phone || null,
                type: 'subscription',
                amount: Number(item.value),
                description: item.plan_name,
              })}
              disabled={sendingReminderId === item.client_id || !item.clients?.phone}
            >
              {sendingReminderId === item.client_id ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <MessageCircle className="w-4 h-4 mr-2" />
              )}
              {!item.clients?.phone ? 'Sem telefone' : sendingReminderId === item.client_id ? 'Enviando...' : 'Enviar WhatsApp'}
            </DropdownMenuItem>
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
                <DialogTitle className="font-heading text-xl">Nova Cobrança</DialogTitle>
                <DialogDescription>
                  Crie uma nova cobrança para um cliente.
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="recurring" className="w-full mt-4">
                <TabsList className="w-full grid grid-cols-2 mb-4">
                  <TabsTrigger value="recurring" className="gap-2">
                    <Calendar className="w-4 h-4" />
                    Recorrente
                  </TabsTrigger>
                  <TabsTrigger value="single" className="gap-2">
                    <Receipt className="w-4 h-4" />
                    Única
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="recurring" className="space-y-4">
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

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Data de Vencimento *</label>
                    <Input
                      type="date"
                      value={newSubscription.dueDate}
                      onChange={(e) => setNewSubscription({ ...newSubscription, dueDate: e.target.value })}
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
                      Criar Assinatura
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="single" className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cliente *</label>
                    <Select
                      value={newCharge.clientId}
                      onValueChange={(value) => setNewCharge({ ...newCharge, clientId: value })}
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
                    <label className="text-sm font-medium">Valor (R$) *</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={newCharge.value}
                      onChange={(e) => setNewCharge({ ...newCharge, value: e.target.value })}
                      className="bg-secondary/50 border-border/50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Vencimento *</label>
                    <Input
                      type="date"
                      value={newCharge.dueDate}
                      onChange={(e) => setNewCharge({ ...newCharge, dueDate: e.target.value })}
                      className="bg-secondary/50 border-border/50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Método de Pagamento *</label>
                    <div className="flex items-center gap-2 p-3 bg-secondary/50 border border-border/50 rounded-md">
                      <QrCode className="w-4 h-4" />
                      <span>PIX</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Descrição</label>
                    <Input
                      placeholder="Descrição da cobrança"
                      value={newCharge.description}
                      onChange={(e) => setNewCharge({ ...newCharge, description: e.target.value })}
                      className="bg-secondary/50 border-border/50"
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <Button 
                      variant="outline" 
                      className="flex-1 border-border/50"
                      onClick={() => setIsDialogOpen(false)}
                      disabled={isCreatingCharge}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      className="flex-1" 
                      onClick={handleCreateSingleCharge}
                      disabled={isCreatingCharge}
                    >
                      {isCreatingCharge ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Cobrança'}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
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

      {/* Edit Subscription Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="glass-card border-border/50 max-w-[95vw] sm:max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Editar Assinatura</DialogTitle>
            <DialogDescription>
              Atualize as informações da assinatura.
            </DialogDescription>
          </DialogHeader>
          
          {editingSubscription && (
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Cliente</label>
                <Input
                  value={editingSubscription.clients?.name || 'N/A'}
                  disabled
                  className="bg-secondary/50 border-border/50 opacity-60"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome do Plano *</label>
                <Input
                  placeholder="Ex: Plano Empresarial"
                  value={editingSubscription.plan_name}
                  onChange={(e) => setEditingSubscription({ ...editingSubscription, plan_name: e.target.value })}
                  className="bg-secondary/50 border-border/50"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Valor Mensal (R$) *</label>
                <Input
                  type="number"
                  placeholder="299.90"
                  value={editingSubscription.value}
                  onChange={(e) => setEditingSubscription({ ...editingSubscription, value: parseFloat(e.target.value) || 0 })}
                  className="bg-secondary/50 border-border/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Data de Vencimento *</label>
                <Input
                  type="date"
                  value={formatDateForInput(editingSubscription.next_payment)}
                  onChange={(e) => setEditingSubscription({ ...editingSubscription, next_payment: inputDateToISO(e.target.value) })}
                  className="bg-secondary/50 border-border/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={editingSubscription.status}
                  onValueChange={(value) => setEditingSubscription({ ...editingSubscription, status: value })}
                >
                  <SelectTrigger className="bg-secondary/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-border/50">
                    <SelectItem value="active">Ativa</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1 border-border/50"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingSubscription(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={handleUpdateSubscription}>
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="glass-card border-border/50 max-w-[95vw] sm:max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Detalhes da Assinatura</DialogTitle>
            <DialogDescription>
              Informações completas da assinatura.
            </DialogDescription>
          </DialogHeader>
          
          {selectedSubscription && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Cliente</label>
                  <p className="text-sm font-medium text-foreground">{selectedSubscription.clients?.name || 'N/A'}</p>
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Plano</label>
                  <p className="text-sm font-medium text-foreground">{selectedSubscription.plan_name}</p>
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Valor Mensal</label>
                  <p className="text-sm font-medium text-foreground">{formatCurrency(Number(selectedSubscription.value))}</p>
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <StatusBadge status={selectedSubscription.status} />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Próximo Vencimento</label>
                  <p className="text-sm font-medium text-foreground">{formatBrazilDate(selectedSubscription.next_payment)}</p>
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Data de Início</label>
                  <p className="text-sm font-medium text-foreground">{formatBrazilDate(selectedSubscription.start_date)}</p>
                </div>
                
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Data de Criação</label>
                  <p className="text-sm font-medium text-foreground">{formatBrazilDate(selectedSubscription.created_at)}</p>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1 border-border/50"
                  onClick={() => setIsDetailsDialogOpen(false)}
                >
                  Fechar
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={() => {
                    setIsDetailsDialogOpen(false);
                    handleGenerateCharge(selectedSubscription);
                  }}
                  disabled={generatingChargeId === selectedSubscription.id}
                >
                  {generatingChargeId === selectedSubscription.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Gerar Cobrança
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Subscriptions;
