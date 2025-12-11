import { useState } from 'react';
import { Search, Filter, Bell, CheckCircle, XCircle, AlertTriangle, Mail } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const mockNotifications = [
  {
    id: '1',
    type: 'payment_received' as const,
    clientName: 'Construtora Silva & Filhos',
    message: 'Pagamento de R$ 599,90 recebido com sucesso.',
    sentAt: new Date('2024-12-01T10:30:00'),
    status: 'sent' as const,
  },
  {
    id: '2',
    type: 'payment_received' as const,
    clientName: 'Engenharia ABC Ltda',
    message: 'Pagamento de R$ 299,90 recebido com sucesso.',
    sentAt: new Date('2024-12-05T14:15:00'),
    status: 'sent' as const,
  },
  {
    id: '3',
    type: 'payment_failed' as const,
    clientName: 'Projetos & Obras ME',
    message: 'Falha no processamento do pagamento de R$ 149,90.',
    sentAt: new Date('2024-10-10T09:00:00'),
    status: 'sent' as const,
  },
  {
    id: '4',
    type: 'payment_due' as const,
    clientName: 'Arquitetura Moderna',
    message: 'Cobrança de R$ 599,90 enviada para pagamento.',
    sentAt: new Date('2024-12-05T08:00:00'),
    status: 'sent' as const,
  },
  {
    id: '5',
    type: 'subscription_renewed' as const,
    clientName: 'TechBuild Construções',
    message: 'Assinatura renovada automaticamente.',
    sentAt: new Date('2024-12-08T11:45:00'),
    status: 'sent' as const,
  },
];

const typeConfig = {
  payment_received: {
    icon: CheckCircle,
    label: 'Pagamento',
    bgClass: 'bg-success/10',
    iconClass: 'text-success',
  },
  payment_failed: {
    icon: XCircle,
    label: 'Falha',
    bgClass: 'bg-destructive/10',
    iconClass: 'text-destructive',
  },
  payment_due: {
    icon: AlertTriangle,
    label: 'Cobrança',
    bgClass: 'bg-warning/10',
    iconClass: 'text-warning',
  },
  subscription_renewed: {
    icon: Bell,
    label: 'Renovação',
    bgClass: 'bg-primary/10',
    iconClass: 'text-primary',
  },
};

const Notifications = () => {
  const [search, setSearch] = useState('');

  const filteredNotifications = mockNotifications.filter(notification =>
    notification.clientName.toLowerCase().includes(search.toLowerCase()) ||
    notification.message.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout 
      title="Notificações" 
      subtitle="Histórico de notificações enviadas"
    >
      {/* Header Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 mb-4 sm:mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar notificação..."
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div className="glass-card p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-2xl font-bold text-foreground">{mockNotifications.length}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Total</p>
        </div>
        <div className="glass-card p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-2xl font-bold text-success">
            {mockNotifications.filter(n => n.type === 'payment_received').length}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">Pagamentos</p>
        </div>
        <div className="glass-card p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-2xl font-bold text-warning">
            {mockNotifications.filter(n => n.type === 'payment_due').length}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">Cobranças</p>
        </div>
        <div className="glass-card p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-2xl font-bold text-destructive">
            {mockNotifications.filter(n => n.type === 'payment_failed').length}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">Falhas</p>
        </div>
      </div>

      {/* Notification List */}
      <div className="space-y-2 sm:space-y-3">
        {filteredNotifications.map((notification) => {
          const config = typeConfig[notification.type];
          const Icon = config.icon;
          
          return (
            <div 
              key={notification.id} 
              className="glass-card glass-card-hover p-3 sm:p-4 flex items-start gap-3 sm:gap-4"
            >
              <div className={cn('p-2 sm:p-3 rounded-xl flex-shrink-0', config.bgClass)}>
                <Icon className={cn('w-4 h-4 sm:w-5 sm:h-5', config.iconClass)} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 sm:gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm sm:text-base truncate">
                      {notification.clientName}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                    {format(notification.sentAt, "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 mt-2">
                  <span className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium',
                    config.bgClass,
                    config.iconClass
                  )}>
                    {config.label}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                    <Mail className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    Enviado
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredNotifications.length === 0 && (
        <div className="glass-card p-8 sm:p-12 text-center">
          <Bell className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-heading text-base sm:text-lg font-semibold text-foreground mb-2">
            Nenhuma notificação encontrada
          </h3>
          <p className="text-sm text-muted-foreground">
            Tente ajustar os filtros ou termo de busca.
          </p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Notifications;
