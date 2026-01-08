import { useState, useMemo } from 'react';
import { Search, FileText, Download, Eye, Trash2, Plus, Calendar, User, DollarSign } from 'lucide-react';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DashboardLayout from '@/components/DashboardLayout';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { formatBrazilDate } from '@/utils/dateUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InvoiceWithClient {
  id: string;
  payment_id: string | null;
  client_id: string;
  number: string;
  amount: number;
  status: string;
  issued_at: string;
  clientName?: string;
}

const Invoices = () => {
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithClient | null>(null);
  const [newInvoice, setNewInvoice] = useState({ client_id: '', amount: '' });
  const [isCreating, setIsCreating] = useState(false);
  const { invoices, clients, loadingInvoices, loadingClients, refetchAll, deleteInvoice } = useGlobalData();

  const loading = loadingInvoices || loadingClients;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Enrich invoices with client names
  const enrichedInvoices = useMemo(() => {
    return invoices.map(inv => ({
      ...inv,
      clientName: clients.find(c => c.id === inv.client_id)?.name || 'Cliente não encontrado'
    }));
  }, [invoices, clients]);

  const filteredInvoices = enrichedInvoices.filter(invoice =>
    invoice.clientName.toLowerCase().includes(search.toLowerCase()) ||
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
    try {
      const { error } = await supabase.from('invoices').delete().eq('id', invoiceId);
      if (error) throw error;
      toast.success('Nota fiscal removida com sucesso!');
      refetchAll();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Erro ao remover nota fiscal');
    }
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
      refetchAll();
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Erro ao criar nota fiscal');
    } finally {
      setIsCreating(false);
    }
  };

  const handleViewDetails = (invoice: InvoiceWithClient) => {
    setSelectedInvoice(invoice);
    setIsDetailsOpen(true);
  };

  const handleDownloadPDF = (invoice: InvoiceWithClient) => {
    // Create a simple PDF-like content and download
    const content = `
NOTA FISCAL
===========

Número: ${invoice.number}
Data de Emissão: ${formatBrazilDate(invoice.issued_at)}
Status: ${invoice.status === 'issued' ? 'Emitida' : invoice.status}

CLIENTE
-------
Nome: ${invoice.clientName}

VALORES
-------
Valor Total: ${formatCurrency(invoice.amount)}

---
Documento gerado automaticamente pelo sistema P-CON
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${invoice.number}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Nota fiscal baixada!');
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div className="glass-card p-3 sm:p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Total Emitidas</p>
        </div>
        <div className="glass-card p-3 sm:p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-success" />
          </div>
          <p className="text-sm sm:text-xl font-bold text-success">{formatCurrency(stats.totalIssued)}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Valor Total</p>
        </div>
        <div className="glass-card p-3 sm:p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-primary">{stats.thisMonthCount}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Este Mês</p>
        </div>
        <div className="glass-card p-3 sm:p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <p className="text-sm sm:text-xl font-bold text-primary">{formatCurrency(stats.thisMonthTotal)}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Total Este Mês</p>
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
              <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 truncate flex items-center gap-1">
                <User className="w-3 h-3" />
                {invoice.clientName}
              </p>
              
              <div className="flex items-center justify-between text-xs sm:text-sm mb-3 sm:mb-4">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatBrazilDate(invoice.issued_at)}
                </span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(Number(invoice.amount))}
                </span>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 gap-1 sm:gap-2 border-border/50 text-xs sm:text-sm h-8 sm:h-9"
                  onClick={() => handleViewDetails(invoice)}
                >
                  <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                  Ver
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 gap-1 sm:gap-2 border-border/50 text-xs sm:text-sm h-8 sm:h-9"
                  onClick={() => handleDownloadPDF(invoice)}
                >
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

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="glass-card border-border/50 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Detalhes da Nota Fiscal
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4 pt-2">
              <div className="glass-card p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Número:</span>
                  <span className="font-semibold text-foreground">{selectedInvoice.number}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Cliente:</span>
                  <span className="font-medium text-foreground">{selectedInvoice.clientName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Valor:</span>
                  <span className="font-bold text-success text-lg">{formatCurrency(selectedInvoice.amount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Data de Emissão:</span>
                  <span className="font-medium text-foreground">{formatBrazilDate(selectedInvoice.issued_at)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Status:</span>
                  <StatusBadge status={selectedInvoice.status} />
                </div>
              </div>
              
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDetailsOpen(false)}
                  className="flex-1"
                >
                  Fechar
                </Button>
                <Button
                  onClick={() => {
                    handleDownloadPDF(selectedInvoice);
                    setIsDetailsOpen(false);
                  }}
                  className="flex-1 gap-2"
                >
                  <Download className="w-4 h-4" />
                  Baixar PDF
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Invoices;
