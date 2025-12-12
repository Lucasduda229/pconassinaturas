import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, MoreHorizontal, Mail, Phone, Trash2, RefreshCw, CreditCard, QrCode, FileText, Loader2, Link2, Send, Eye, EyeOff, Pencil, Download, User } from 'lucide-react';
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
import { useClients, Client } from '@/hooks/useClients';
import { useAsaas } from '@/hooks/useAsaas';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { exportToCSV, formatDateForExport } from '@/utils/exportUtils';

const Clients = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isChargeDialogOpen, setIsChargeDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreatingCharge, setIsCreatingCharge] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    phone: '',
    document: '',
  });
  const [newCharge, setNewCharge] = useState({
    value: '',
    description: '',
    dueDate: '',
    billingType: 'PIX' as 'PIX' | 'BOLETO' | 'CREDIT_CARD',
  });
  const [isAccessDialogOpen, setIsAccessDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [accessPassword, setAccessPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isCreatingAccess, setIsCreatingAccess] = useState(false);

  const { clients, loading, addClient, updateClient, deleteClient } = useClients();
  const { createCustomer, createPayment } = useAsaas();

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    setIsEditDialogOpen(true);
  };

  const handleUpdateClient = async () => {
    if (!editingClient) return;
    
    const result = await updateClient(editingClient.id, {
      name: editingClient.name,
      email: editingClient.email,
      phone: editingClient.phone,
      document: editingClient.document,
      status: editingClient.status,
    });

    if (result) {
      setIsEditDialogOpen(false);
      setEditingClient(null);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    client.email.toLowerCase().includes(search.toLowerCase()) ||
    (client.document && client.document.includes(search))
  );

  const handleAddClient = async () => {
    if (!newClient.name || !newClient.email) {
      toast.error('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const result = await addClient({
      name: newClient.name,
      email: newClient.email,
      phone: newClient.phone || null,
      document: newClient.document || null,
    });

    if (result) {
      setNewClient({ name: '', email: '', phone: '', document: '' });
      setIsDialogOpen(false);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    await deleteClient(clientId);
  };

  const handleSyncWithAsaas = async (client: Client) => {
    setIsSyncing(true);
    try {
      const result = await createCustomer({
        name: client.name,
        email: client.email,
        cpfCnpj: client.document?.replace(/[^\d]/g, '') || '',
        phone: client.phone?.replace(/[^\d]/g, '') || undefined,
      });
      
      if (result) {
        toast.success(`Cliente "${client.name}" sincronizado com ASAAS!`);
      }
    } catch (error) {
      toast.error('Erro ao sincronizar cliente com ASAAS');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateCharge = async () => {
    if (!selectedClient || !newCharge.value || !newCharge.dueDate) {
      toast.error('Preencha todos os campos obrigatórios');
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

      // Create the payment
      const payment = await createPayment({
        customer: customer.id,
        billingType: newCharge.billingType,
        value: parseFloat(newCharge.value),
        dueDate: newCharge.dueDate,
        description: newCharge.description || `Cobrança para ${selectedClient.name}`,
      });

      if (payment) {
        toast.success('Cobrança criada com sucesso!');
        setIsChargeDialogOpen(false);
        setNewCharge({ value: '', description: '', dueDate: '', billingType: 'PIX' });
        setSelectedClient(null);
      }
    } catch (error) {
      toast.error('Erro ao criar cobrança');
    } finally {
      setIsCreatingCharge(false);
    }
  };

  const openChargeDialog = (client: Client) => {
    setSelectedClient(client);
    setIsChargeDialogOpen(true);
  };

  const [hasExistingAccess, setHasExistingAccess] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);

  const openAccessDialog = async (client: Client) => {
    setSelectedClient(client);
    setAccessPassword('');
    setHasExistingAccess(false);
    setIsCheckingAccess(true);
    setIsAccessDialogOpen(true);

    // Check if access already exists
    try {
      const { data } = await import('@/integrations/supabase/client').then(m => 
        m.supabase.from('client_users').select('id').eq('client_id', client.id).single()
      );
      setHasExistingAccess(!!data);
    } catch {
      setHasExistingAccess(false);
    } finally {
      setIsCheckingAccess(false);
    }
  };

  const handleCreateAccess = async () => {
    if (!selectedClient || !accessPassword) {
      toast.error('Por favor, defina uma senha');
      return;
    }

    if (accessPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setIsCreatingAccess(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/client-auth?action=register`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            clientId: selectedClient.id,
            email: selectedClient.email,
            password: accessPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'Email já cadastrado') {
          toast.error('Este cliente já possui acesso. Use "Reenviar Link" ou "Redefinir Senha".');
        } else {
          toast.error(data.error || 'Erro ao criar acesso');
        }
        return;
      }

      toast.success('Acesso criado com sucesso!');
      sendWhatsAppLink();
      setIsAccessDialogOpen(false);
    } catch (error) {
      console.error('Error creating access:', error);
      toast.error('Erro ao criar acesso');
    } finally {
      setIsCreatingAccess(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedClient || !accessPassword) {
      toast.error('Por favor, defina uma nova senha');
      return;
    }

    if (accessPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setIsCreatingAccess(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/client-auth?action=reset-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            clientId: selectedClient.id,
            password: accessPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Erro ao redefinir senha');
        return;
      }

      toast.success('Senha redefinida com sucesso!');
      sendWhatsAppLink();
      setIsAccessDialogOpen(false);
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Erro ao redefinir senha');
    } finally {
      setIsCreatingAccess(false);
    }
  };

  const sendWhatsAppLink = () => {
    if (!selectedClient) return;
    const checkoutUrl = `${window.location.origin}/cliente`;
    const message = `Olá ${selectedClient.name}!\n\nSeu acesso ao portal de pagamentos foi criado.\n\n📱 Acesse: ${checkoutUrl}\n📧 Email: ${selectedClient.email}\n🔐 Senha: ${accessPassword}\n\nQualquer dúvida, estamos à disposição!`;
    const whatsappUrl = `https://wa.me/${selectedClient.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleResendLink = () => {
    if (!selectedClient) return;
    const checkoutUrl = `${window.location.origin}/cliente`;
    const message = `Olá ${selectedClient.name}!\n\nSegue o link para acessar seu portal de pagamentos:\n\n📱 Acesse: ${checkoutUrl}\n📧 Email: ${selectedClient.email}\n\nCaso tenha esquecido a senha, entre em contato conosco.`;
    const whatsappUrl = `https://wa.me/${selectedClient.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    toast.success('Link enviado via WhatsApp!');
  };

  const copyCheckoutLink = () => {
    const checkoutUrl = `${window.location.origin}/cliente`;
    navigator.clipboard.writeText(checkoutUrl);
    toast.success('Link copiado!');
  };

  const columns = [
    {
      key: 'name',
      header: 'Cliente',
      render: (item: Client) => (
        <div>
          <p className="font-medium text-foreground text-sm">{item.name}</p>
          <p className="text-xs text-muted-foreground">{item.document}</p>
          <p className="text-xs text-muted-foreground sm:hidden">{item.email}</p>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contato',
      hideOnMobile: true,
      render: (item: Client) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{item.email}</span>
          </div>
          {item.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="w-4 h-4 flex-shrink-0" />
              {item.phone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Cadastro',
      hideOnMobile: true,
      render: (item: Client) => (
        <span className="text-muted-foreground">
          {format(new Date(item.created_at), 'dd/MM/yyyy', { locale: ptBR })}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: Client) => <StatusBadge status={item.status} />,
    },
    {
      key: 'actions',
      header: '',
      render: (item: Client) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-card border-border/50">
            <DropdownMenuItem onClick={() => navigate(`/clients/${item.id}`)}>
              <User className="w-4 h-4 mr-2" />
              Ver perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEditDialog(item)}>
              <Pencil className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openChargeDialog(item)}>
              <CreditCard className="w-4 h-4 mr-2" />
              Nova cobrança
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openAccessDialog(item)}>
              <Link2 className="w-4 h-4 mr-2" />
              Criar acesso checkout
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive"
              onClick={() => handleDeleteClient(item.id)}
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
      title="Clientes" 
      subtitle="Gerencie os clientes cadastrados no sistema"
    >
      {/* Header Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 mb-4 sm:mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-secondary/50 border-border/50 h-10 sm:h-11"
          />
        </div>
        
        <div className="flex gap-2 sm:gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-10 sm:h-11 gap-2 border-border/50 bg-secondary/50"
            onClick={() => {
              exportToCSV(clients, 'clientes', [
                { key: 'name', label: 'Nome' },
                { key: 'email', label: 'Email' },
                { key: 'phone', label: 'Telefone' },
                { key: 'document', label: 'CPF/CNPJ' },
                { key: 'status', label: 'Status' },
                { key: 'created_at', label: 'Cadastro' },
              ]);
              toast.success('Exportação concluída!');
            }}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-10 sm:h-11 gap-2 flex-1 sm:flex-none">
                <Plus className="w-4 h-4" />
                <span>Novo</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-border/50 max-w-[95vw] sm:max-w-md mx-auto">
              <DialogHeader>
                <DialogTitle className="font-heading text-xl">Novo Cliente</DialogTitle>
                <DialogDescription>
                  Preencha os dados para cadastrar um novo cliente.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome / Razão Social *</label>
                  <Input
                    placeholder="Nome do cliente"
                    value={newClient.name}
                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                    className="bg-secondary/50 border-border/50"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">E-mail *</label>
                  <Input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={newClient.email}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    className="bg-secondary/50 border-border/50"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Telefone</label>
                  <Input
                    placeholder="(00) 00000-0000"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                    className="bg-secondary/50 border-border/50"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">CPF / CNPJ</label>
                  <Input
                    placeholder="000.000.000-00"
                    value={newClient.document}
                    onChange={(e) => setNewClient({ ...newClient, document: e.target.value })}
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
                  <Button className="flex-1" onClick={handleAddClient}>
                    Cadastrar
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
          <p className="text-xl sm:text-2xl font-bold text-foreground">{clients.length}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Total</p>
        </div>
        <div className="glass-card p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-2xl font-bold text-success">{clients.filter(c => c.status === 'active').length}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Ativos</p>
        </div>
        <div className="glass-card p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-2xl font-bold text-warning">{clients.filter(c => c.status === 'inactive').length}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Inativos</p>
        </div>
        <div className="glass-card p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-2xl font-bold text-primary">
            {clients.filter(c => {
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              return new Date(c.created_at) > thirtyDaysAgo;
            }).length}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">Novos (30d)</p>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="glass-card p-8 text-center">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      ) : (
        <DataTable data={filteredClients} columns={columns} />
      )}

      {/* Charge Dialog */}
      <Dialog open={isChargeDialogOpen} onOpenChange={setIsChargeDialogOpen}>
        <DialogContent className="glass-card border-border/50 max-w-[95vw] sm:max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Nova Cobrança</DialogTitle>
            <DialogDescription>
              Criar cobrança para {selectedClient?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor *</label>
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
              <Select 
                value={newCharge.billingType} 
                onValueChange={(value: 'PIX' | 'BOLETO' | 'CREDIT_CARD') => setNewCharge({ ...newCharge, billingType: value })}
              >
                <SelectTrigger className="bg-secondary/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4" />
                      PIX
                    </div>
                  </SelectItem>
                  <SelectItem value="BOLETO">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Boleto
                    </div>
                  </SelectItem>
                  <SelectItem value="CREDIT_CARD">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Cartão de Crédito
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
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
                onClick={() => setIsChargeDialogOpen(false)}
                disabled={isCreatingCharge}
              >
                Cancelar
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleCreateCharge}
                disabled={isCreatingCharge}
              >
                {isCreatingCharge ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Cobrança'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Access Dialog */}
      <Dialog open={isAccessDialogOpen} onOpenChange={setIsAccessDialogOpen}>
        <DialogContent className="glass-card border-border/50 max-w-[95vw] sm:max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">
              {hasExistingAccess ? 'Gerenciar Acesso' : 'Criar Acesso ao Checkout'}
            </DialogTitle>
            <DialogDescription>
              {hasExistingAccess 
                ? `O cliente ${selectedClient?.name} já possui acesso. Você pode reenviar o link ou redefinir a senha.`
                : `Criar acesso para ${selectedClient?.name} acessar a página de checkout e pagar suas assinaturas.`
              }
            </DialogDescription>
          </DialogHeader>
          
          {isCheckingAccess ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <p className="text-sm font-medium">Dados de acesso:</p>
                <p className="text-sm text-muted-foreground">
                  <strong>Email:</strong> {selectedClient?.email}
                </p>
                {hasExistingAccess && (
                  <p className="text-xs text-success">✓ Acesso já configurado</p>
                )}
              </div>

              {hasExistingAccess ? (
                <>
                  <div className="flex items-center gap-2 p-3 bg-warning/10 rounded-lg">
                    <RefreshCw className="h-4 w-4 text-warning flex-shrink-0" />
                    <p className="text-xs text-warning">
                      Para redefinir a senha, digite uma nova senha abaixo.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nova Senha (opcional)</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Deixe vazio para apenas reenviar link"
                        value={accessPassword}
                        onChange={(e) => setAccessPassword(e.target.value)}
                        className="bg-secondary/50 border-border/50 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={copyCheckoutLink}
                      className="gap-2"
                    >
                      <Link2 className="w-4 h-4" />
                      Copiar link
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleResendLink}
                      className="gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Reenviar Link
                    </Button>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <Button 
                      variant="outline" 
                      className="flex-1 border-border/50"
                      onClick={() => setIsAccessDialogOpen(false)}
                      disabled={isCreatingAccess}
                    >
                      Fechar
                    </Button>
                    <Button 
                      className="flex-1" 
                      onClick={handleResetPassword}
                      disabled={isCreatingAccess || !accessPassword}
                    >
                      {isCreatingAccess ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Redefinindo...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Redefinir Senha
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Senha *</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mínimo 6 caracteres"
                        value={accessPassword}
                        onChange={(e) => setAccessPassword(e.target.value)}
                        className="bg-secondary/50 border-border/50 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                    <Send className="h-4 w-4 text-primary flex-shrink-0" />
                    <p className="text-xs text-primary">
                      Após criar o acesso, será aberto o WhatsApp com o link e senha para enviar ao cliente.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={copyCheckoutLink}
                      className="gap-2"
                    >
                      <Link2 className="w-4 h-4" />
                      Copiar link
                    </Button>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <Button 
                      variant="outline" 
                      className="flex-1 border-border/50"
                      onClick={() => setIsAccessDialogOpen(false)}
                      disabled={isCreatingAccess}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      className="flex-1" 
                      onClick={handleCreateAccess}
                      disabled={isCreatingAccess || !accessPassword}
                    >
                      {isCreatingAccess ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Criando...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Criar e Enviar
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="glass-card border-border/50 max-w-[95vw] sm:max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Editar Cliente</DialogTitle>
            <DialogDescription>
              Atualize as informações do cliente.
            </DialogDescription>
          </DialogHeader>
          
          {editingClient && (
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome / Razão Social *</label>
                <Input
                  placeholder="Nome do cliente"
                  value={editingClient.name}
                  onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                  className="bg-secondary/50 border-border/50"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">E-mail *</label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={editingClient.email}
                  onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                  className="bg-secondary/50 border-border/50"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Telefone</label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={editingClient.phone || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                  className="bg-secondary/50 border-border/50"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">CPF / CNPJ</label>
                <Input
                  placeholder="000.000.000-00"
                  value={editingClient.document || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, document: e.target.value })}
                  className="bg-secondary/50 border-border/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={editingClient.status}
                  onValueChange={(value) => setEditingClient({ ...editingClient, status: value })}
                >
                  <SelectTrigger className="bg-secondary/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-border/50">
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1 border-border/50"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingClient(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={handleUpdateClient}>
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Clients;
