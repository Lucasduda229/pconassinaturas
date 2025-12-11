import { Search, Filter, FileText, Download, Eye } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const mockInvoices = [
  {
    id: '1',
    number: 'NF-2024-001',
    clientName: 'Construtora Silva & Filhos',
    amount: 599.90,
    issuedAt: new Date('2024-12-01'),
    status: 'issued' as const,
  },
  {
    id: '2',
    number: 'NF-2024-002',
    clientName: 'Engenharia ABC Ltda',
    amount: 299.90,
    issuedAt: new Date('2024-12-05'),
    status: 'issued' as const,
  },
  {
    id: '3',
    number: 'NF-2024-003',
    clientName: 'TechBuild Construções',
    amount: 299.90,
    issuedAt: new Date('2024-12-08'),
    status: 'issued' as const,
  },
];

const Invoices = () => {
  const [search, setSearch] = useState('');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const filteredInvoices = mockInvoices.filter(invoice =>
    invoice.clientName.toLowerCase().includes(search.toLowerCase()) ||
    invoice.number.toLowerCase().includes(search.toLowerCase())
  );

  const totalIssued = mockInvoices.reduce((acc, inv) => acc + inv.amount, 0);

  return (
    <DashboardLayout 
      title="Notas Fiscais" 
      subtitle="Gerencie as notas fiscais emitidas"
    >
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou número..."
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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{mockInvoices.length}</p>
          <p className="text-sm text-muted-foreground">Notas Emitidas</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{formatCurrency(totalIssued)}</p>
          <p className="text-sm text-muted-foreground">Valor Total</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-success">{mockInvoices.length}</p>
          <p className="text-sm text-muted-foreground">Este Mês</p>
        </div>
      </div>

      {/* Invoice Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredInvoices.map((invoice) => (
          <div key={invoice.id} className="glass-card glass-card-hover p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <StatusBadge status={invoice.status} />
            </div>
            
            <h3 className="font-heading font-semibold text-foreground mb-1">
              {invoice.number}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              {invoice.clientName}
            </p>
            
            <div className="flex items-center justify-between text-sm mb-4">
              <span className="text-muted-foreground">
                {format(invoice.issuedAt, 'dd/MM/yyyy', { locale: ptBR })}
              </span>
              <span className="font-semibold text-foreground">
                {formatCurrency(invoice.amount)}
              </span>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 gap-2 border-border/50">
                <Eye className="w-4 h-4" />
                Ver
              </Button>
              <Button variant="outline" size="sm" className="flex-1 gap-2 border-border/50">
                <Download className="w-4 h-4" />
                PDF
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filteredInvoices.length === 0 && (
        <div className="glass-card p-12 text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
            Nenhuma nota encontrada
          </h3>
          <p className="text-muted-foreground">
            Tente ajustar os filtros ou termo de busca.
          </p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Invoices;
