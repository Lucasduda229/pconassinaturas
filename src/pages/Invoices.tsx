import { useState, useMemo } from 'react';
import { Search, Filter, FileText, Download, Eye, Trash2, Plus } from 'lucide-react';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import DashboardLayout from '@/components/DashboardLayout';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useInvoices } from '@/hooks/useInvoices';
import { useClients } from '@/hooks/useClients';
import { formatBrazilDate } from '@/utils/dateUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Invoices = () => {
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState({ client_id: '', amount: '' });
  const [isCreating, setIsCreating] = useState(false);
  const { invoices, loading, deleteInvoice, refetch } = useInvoices();
  const { clients } = useClients();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const filteredInvoices = invoices.filter(invoice =>
    (invoice.clients?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    invoice.number.toLowerCase().includes(search.toLowerCase())
  );

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const thisMonthInvoices = invoices.filter(inv => {
      const issuedDate = parseISO(inv.issued_at);
      return isWithinInterval(issuedDate, { start: monthStart, end: monthEnd });
    });

    const totalIssued = invoices.reduce((acc, inv) => acc + Number(inv.amount), 0);
    const thisMonthTotal = thisMonthInvoices.reduce((acc, inv) => acc + Number(inv.amount), 0);

    return {
      total: invoices.length,
      totalIssued,
      thisMonthCount: thisMonthInvoices.length,
      thisMonthTotal,
    };
  }, [invoices]);

  const handleDeleteInvoice = async (invoiceId: string) => {
    await deleteInvoice(invoiceId);
  };

  const handleCreateInvoice = async () => {
    if (!newInvoice.client_id || !newInvoice.amount) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsCreating(true);
    try {
      const invoiceNumber = `NF-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase.from('invoices').insert({
        client_id: newInvoice.client_id,
        number: invoiceNumber,
        amount: parseFloat(newInvoice.amount),
        status: 'issued',
      });

      if (error) throw error;
      toast.success('Nota fiscal criada com sucesso!');
      setNewInvoice({ client_id: '', amount: '' });
      setIsDialogOpen(false);
      refetch();
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Erro ao criar nota fiscal');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <DashboardLayout 
      title="Notas Fiscais" 
      subtitle="Gerencie as notas fiscais emitidas"
    >
      {/* Header Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 mb-4 sm:mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar nota..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-secondary/50 border-border/50 h-10 sm:h-11"
          />
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-10 sm:h-11 gap-2">
              <Plus className="w-4 h-4" />
              <span>Nova Nota</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-border/50">
            <DialogHeader>
              <DialogTitle>Nova Nota Fiscal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={newInvoice.client_id} onValueChange={(v) => setNewInvoice(prev => ({ ...prev, client_id: v }))}>
                  <SelectTrigger className="bg-secondary/50 border-border/50">
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={newInvoice.amount}
                  onChange={(e) => setNewInvoice(prev => ({ ...prev, amount: e.target.value }))}
                  className="bg-secondary/50 border-border/50"
                />
              </div>
              <Button onClick={handleCreateInvoice} disabled={isCreating} className="w-full">
                {isCreating ? 'Criando...' : 'Criar Nota Fiscal'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div className="glass-card p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Emitidas</p>
        </div>
        <div className="glass-card p-3 sm:p-4 text-center">
          <p className="text-sm sm:text-xl font-bold text-primary">{formatCurrency(stats.totalIssued)}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Valor Total</p>
        </div>
        <div className="glass-card p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-2xl font-bold text-success">{stats.thisMonthCount}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Este Mês</p>
        </div>
      </div>

      {/* Invoice Cards */}
      {loading ? (
        <div className="glass-card p-8 text-center">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredInvoices.map((invoice) => (
            <div key={invoice.id} className="glass-card glass-card-hover p-4 sm:p-5">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <StatusBadge status={invoice.status} />
              </div>
              
              <h3 className="font-heading font-semibold text-foreground text-sm sm:text-base mb-1">
                {invoice.number}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 truncate">
                {invoice.clients?.name || 'N/A'}
              </p>
              
              <div className="flex items-center justify-between text-xs sm:text-sm mb-3 sm:mb-4">
                <span className="text-muted-foreground">
                  {formatBrazilDate(invoice.issued_at)}
                </span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(Number(invoice.amount))}
                </span>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-1 sm:gap-2 border-border/50 text-xs sm:text-sm h-8 sm:h-9">
                  <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                  Ver
                </Button>
                <Button variant="outline" size="sm" className="flex-1 gap-1 sm:gap-2 border-border/50 text-xs sm:text-sm h-8 sm:h-9">
                  <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                  PDF
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-1 sm:gap-2 border-destructive/50 text-destructive hover:bg-destructive/10 text-xs sm:text-sm h-8 sm:h-9"
                  onClick={() => handleDeleteInvoice(invoice.id)}
                >
                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredInvoices.length === 0 && (
        <div className="glass-card p-8 sm:p-12 text-center">
          <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-heading text-base sm:text-lg font-semibold text-foreground mb-2">
            Nenhuma nota encontrada
          </h3>
          <p className="text-sm text-muted-foreground">
            Tente ajustar os filtros ou termo de busca.
          </p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Invoices;
