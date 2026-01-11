import { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Link2,
  MousePointerClick,
  Users,
  DollarSign,
  Copy,
  CheckCircle,
  Clock,
  Gift,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { useClientReferrals } from '@/hooks/useReferrals';

interface ClientReferralsProps {
  clientId: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const ClientReferrals = ({ clientId }: ClientReferralsProps) => {
  const { link, clicks, leads, rewards, settings, stats, loading } = useClientReferrals(clientId);

  const handleCopyLink = () => {
    if (link) {
      const url = `${window.location.origin}/r/${link.slug}`;
      navigator.clipboard.writeText(url);
      toast.success('Link copiado!');
    }
  };

  const getRewardStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
      pending: { 
        label: 'Pendente', 
        icon: <Clock className="h-3 w-3" />,
        className: 'bg-warning/20 text-warning border-warning/30' 
      },
      approved: { 
        label: 'Aprovado', 
        icon: <CheckCircle className="h-3 w-3" />,
        className: 'bg-primary/20 text-primary border-primary/30' 
      },
      paid: { 
        label: 'Pago', 
        icon: <DollarSign className="h-3 w-3" />,
        className: 'bg-success/20 text-success border-success/30' 
      },
    };
    const config = configs[status] || { label: status, icon: null, className: 'bg-muted' };
    return (
      <Badge className={`${config.className} border flex items-center gap-1`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  // If system is not active, don't show anything
  if (!settings?.is_active) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Gift className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-heading font-semibold text-foreground">
          Programa de Indicações
        </h2>
      </div>

      {/* Info Banner */}
      <Card className="glass-card border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Gift className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-1">
                Ganhe {formatCurrency(settings?.reward_value || 100)} por indicação!
              </h3>
              <p className="text-sm text-muted-foreground">
                Indique novos clientes e receba uma recompensa quando o projeto for fechado. 
                A indicação é válida por {settings?.validity_days || 60} dias.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral Link */}
      {link ? (
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Seu Link de Indicação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-secondary/30 rounded-lg px-4 py-3 border border-border/30">
                <code className="text-sm text-foreground break-all">
                  {window.location.origin}/r/{link.slug}
                </code>
              </div>
              <Button onClick={handleCopyLink} size="icon" variant="outline">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {!link.is_active && (
              <div className="flex items-center gap-2 mt-3 text-sm text-warning">
                <AlertCircle className="h-4 w-4" />
                Seu link está temporariamente desativado
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card">
          <CardContent className="py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Link2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              Seu link de indicação ainda não foi criado. Entre em contato com o suporte.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {link && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
                  <MousePointerClick className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Acessos</p>
                  <p className="text-xl font-bold">{stats.totalClicks}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-secondary/50 flex items-center justify-center">
                  <Users className="h-4 w-4 text-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Leads</p>
                  <p className="text-xl font-bold">{stats.totalLeads}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-success/20 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fechados</p>
                  <p className="text-xl font-bold">{stats.totalConversions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-success/20 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ganhos</p>
                  <p className="text-lg font-bold">{formatCurrency(stats.totalEarned)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rewards Table */}
      {rewards.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Suas Recompensas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rewards.map((reward) => (
                  <TableRow key={reward.id}>
                    <TableCell className="font-medium">
                      {reward.referral_lead?.lead_name || 'N/A'}
                    </TableCell>
                    <TableCell>{formatCurrency(Number(reward.amount))}</TableCell>
                    <TableCell>{getRewardStatusBadge(reward.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(reward.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {rewards.length === 0 && link && (
        <Card className="glass-card">
          <CardContent className="py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Gift className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-1">
              Você ainda não tem recompensas
            </p>
            <p className="text-sm text-muted-foreground">
              Compartilhe seu link de indicação para começar a ganhar!
            </p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
};

export default ClientReferrals;
