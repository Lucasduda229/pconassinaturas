import { useState } from 'react';
import { Search, Filter, FileText, Download, Eye, Trash2 } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useInvoices } from '@/hooks/useInvoices';
import { formatBrazilDate } from '@/utils/dateUtils';

const Invoices = () => {
  const [search, setSearch] = useState('');
  const { invoices, loading, deleteInvoice } = useInvoices();

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

  const totalIssued = invoices.reduce((acc, inv) => acc + Number(inv.amount), 0);

  const handleDeleteInvoice = async (invoiceId: string) => {
    await deleteInvoice(invoiceId);
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
        
        <Button variant="outline" size="sm" className="h-10 sm:h-11 gap-2 border-border/50 bg-secondary/50">
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filtros</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div className="glass-card p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-2xl font-bold text-foreground">{invoices.length}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Emitidas</p>
        </div>
        <div className="glass-card p-3 sm:p-4 text-center">
          <p className="text-sm sm:text-xl font-bold text-primary">{formatCurrency(totalIssued)}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Valor Total</p>
        </div>
        <div className="glass-card p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-2xl font-bold text-success">{invoices.length}</p>
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
