import { useState } from 'react';
import { Plus, Search, Filter, MoreHorizontal, Mail, Phone, Trash2 } from 'lucide-react';
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
import { mockClients } from '@/data/mockData';
import { Client } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const Clients = () => {
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState(mockClients);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    phone: '',
    document: '',
  });

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    client.email.toLowerCase().includes(search.toLowerCase()) ||
    client.document.includes(search)
  );

  const handleAddClient = () => {
    if (!newClient.name || !newClient.email) {
      toast.error('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const client: Client = {
      id: String(clients.length + 1),
      ...newClient,
      status: 'active',
      createdAt: new Date(),
    };

    setClients([...clients, client]);
    setNewClient({ name: '', email: '', phone: '', document: '' });
    setIsDialogOpen(false);
    toast.success('Cliente cadastrado com sucesso!');
  };

  const handleDeleteClient = (clientId: string) => {
    setClients(clients.filter(c => c.id !== clientId));
    toast.success('Cliente removido com sucesso!');
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
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="w-4 h-4 flex-shrink-0" />
            {item.phone}
          </div>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Cadastro',
      hideOnMobile: true,
      render: (item: Client) => (
        <span className="text-muted-foreground">
          {format(item.createdAt, 'dd/MM/yyyy', { locale: ptBR })}
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
            <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
            <DropdownMenuItem>Editar</DropdownMenuItem>
            <DropdownMenuItem>Nova assinatura</DropdownMenuItem>
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
          <Button variant="outline" size="sm" className="h-10 sm:h-11 gap-2 border-border/50 bg-secondary/50 flex-1 sm:flex-none">
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filtros</span>
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
              return c.createdAt > thirtyDaysAgo;
            }).length}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">Novos (30d)</p>
        </div>
      </div>

      {/* Table */}
      <DataTable data={filteredClients} columns={columns} />
    </DashboardLayout>
  );
};

export default Clients;
