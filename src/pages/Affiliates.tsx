import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  DollarSign,
  MousePointerClick,
  Search,
  CheckCircle,
  XCircle,
  Eye,
  MoreHorizontal,
  Link2,
  TrendingUp,
  Phone,
  Mail,
  Key,
  MessageCircle,
  Trash2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Affiliate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  pix_key: string | null;
  status: string;
  created_at: string;
  approved_at: string | null;
}

interface AffiliateLink {
  id: string;
  affiliate_id: string;
  slug: string;
  is_active: boolean;
  created_at: string;
}

interface AffiliateStats {
  affiliate_id: string;
  clicks: number;
  leads: number;
  conversions: number;
  pending_rewards: number;
  paid_rewards: number;
}

interface AffiliateLead {
  id: string;
  affiliate_link_id: string;
  lead_name: string;
  lead_email: string | null;
  lead_phone: string | null;
  is_converted: boolean;
  converted_at: string | null;
  expires_at: string;
  created_at: string;
  source: string | null;
  affiliate_name?: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (date: string) => {
  return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
};

const Affiliates = () => {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [allLeads, setAllLeads] = useState<AffiliateLead[]>([]);
  const [stats, setStats] = useState<Record<string, AffiliateStats>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'approve' | 'reject'; affiliate: Affiliate } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load affiliates
      const { data: affiliatesData, error: affiliatesError } = await supabase
        .from('affiliates')
        .select('*')
        .order('created_at', { ascending: false });

      if (affiliatesError) throw affiliatesError;
      setAffiliates(affiliatesData || []);

      // Load links
      const { data: linksData } = await supabase
        .from('affiliate_links')
        .select('*');
      setLinks(linksData || []);

      // Load all affiliate leads
      const { data: allLeadsData } = await supabase
        .from('affiliate_leads')
        .select('*')
        .order('created_at', { ascending: false });

      // Map leads with affiliate names
      const leadsWithAffiliates: AffiliateLead[] = (allLeadsData || []).map(lead => {
        const link = linksData?.find(l => l.id === lead.affiliate_link_id);
        const affiliate = affiliatesData?.find(a => a.id === link?.affiliate_id);
        return {
          ...lead,
          affiliate_name: affiliate?.name || 'Desconhecido'
        };
      });
      setAllLeads(leadsWithAffiliates);

      // Load stats for each affiliate
      const statsMap: Record<string, AffiliateStats> = {};
      
      for (const affiliate of affiliatesData || []) {
        const link = linksData?.find(l => l.affiliate_id === affiliate.id);
        
        if (link) {
          // Clicks
          const { count: clicksCount } = await supabase
            .from('affiliate_clicks')
            .select('*', { count: 'exact', head: true })
            .eq('affiliate_link_id', link.id);

          // Leads for this affiliate
          const affiliateLeads = allLeadsData?.filter(l => l.affiliate_link_id === link.id) || [];
          const conversions = affiliateLeads.filter(l => l.is_converted).length;

          // Rewards
          const { data: rewardsData } = await supabase
            .from('affiliate_rewards')
            .select('*')
            .eq('affiliate_link_id', link.id);

          const rewards = rewardsData || [];
          const pendingRewards = rewards
            .filter(r => r.status === 'pending' || r.status === 'approved')
            .reduce((sum, r) => sum + Number(r.amount), 0);
          const paidRewards = rewards
            .filter(r => r.status === 'paid')
            .reduce((sum, r) => sum + Number(r.amount), 0);

          statsMap[affiliate.id] = {
            affiliate_id: affiliate.id,
            clicks: clicksCount || 0,
            leads: affiliateLeads.length,
            conversions,
            pending_rewards: pendingRewards,
            paid_rewards: paidRewards,
          };
        } else {
          statsMap[affiliate.id] = {
            affiliate_id: affiliate.id,
            clicks: 0,
            leads: 0,
            conversions: 0,
            pending_rewards: 0,
            paid_rewards: 0,
          };
        }
      }
      
      setStats(statsMap);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (affiliate: Affiliate) => {
    try {
      const { error } = await supabase
        .from('affiliates')
        .update({ status: 'approved' })
        .eq('id', affiliate.id);

      if (error) throw error;
      
      // Send approval email notification
      try {
        const loginUrl = 'https://www.assinaturaspcon.sbs/afiliados/login';
        await supabase.functions.invoke('affiliate-approval-email', {
          body: {
            affiliateId: affiliate.id,
            affiliateName: affiliate.name,
            affiliateEmail: affiliate.email,
            loginUrl
          }
        });
        toast.success(`${affiliate.name} foi aprovado e notificado por email!`);
      } catch (emailError) {
        console.error('Error sending approval email:', emailError);
        toast.success(`${affiliate.name} foi aprovado! (Falha ao enviar email)`);
      }
      
      loadData();
    } catch (error) {
      console.error('Error approving affiliate:', error);
      toast.error('Erro ao aprovar afiliado');
    }
    setIsConfirmOpen(false);
    setConfirmAction(null);
  };

  const handleReject = async (affiliate: Affiliate) => {
    try {
      const { error } = await supabase
        .from('affiliates')
        .update({ status: 'rejected' })
        .eq('id', affiliate.id);

      if (error) throw error;
      
      toast.success(`${affiliate.name} foi rejeitado`);
      loadData();
    } catch (error) {
      console.error('Error rejecting affiliate:', error);
      toast.error('Erro ao rejeitar afiliado');
    }
    setIsConfirmOpen(false);
    setConfirmAction(null);
  };

  const handleToggleActive = async (affiliate: Affiliate) => {
    const newStatus = affiliate.status === 'approved' ? 'inactive' : 'approved';
    try {
      const { error } = await supabase
        .from('affiliates')
        .update({ status: newStatus })
        .eq('id', affiliate.id);

      if (error) throw error;
      
      toast.success(newStatus === 'approved' ? 'Afiliado ativado' : 'Afiliado desativado');
      loadData();
    } catch (error) {
      console.error('Error toggling affiliate:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const openConfirmDialog = (type: 'approve' | 'reject', affiliate: Affiliate) => {
    setConfirmAction({ type, affiliate });
    setIsConfirmOpen(true);
  };

  const handleDeleteLead = async (leadId: string) => {
    try {
      // First delete associated reward if exists
      await supabase
        .from('affiliate_rewards')
        .delete()
        .eq('affiliate_lead_id', leadId);

      // Delete the lead
      const { error } = await supabase
        .from('affiliate_leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;

      toast.success('Lead removido com sucesso!');
      loadData();
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast.error('Erro ao remover lead');
    }
  };

  const handleDeleteAffiliate = async (affiliate: Affiliate) => {
    try {
      // Get affiliate link
      const link = links.find(l => l.affiliate_id === affiliate.id);
      
      if (link) {
        // Delete rewards
        await supabase
          .from('affiliate_rewards')
          .delete()
          .eq('affiliate_link_id', link.id);

        // Delete leads
        await supabase
          .from('affiliate_leads')
          .delete()
          .eq('affiliate_link_id', link.id);

        // Delete clicks
        await supabase
          .from('affiliate_clicks')
          .delete()
          .eq('affiliate_link_id', link.id);

        // Delete link
        await supabase
          .from('affiliate_links')
          .delete()
          .eq('id', link.id);
      }

      // Delete affiliate user if exists
      await supabase
        .from('affiliate_sessions')
        .delete()
        .in('affiliate_user_id', 
          (await supabase.from('affiliate_users').select('id').eq('affiliate_id', affiliate.id)).data?.map(u => u.id) || []
        );

      await supabase
        .from('affiliate_users')
        .delete()
        .eq('affiliate_id', affiliate.id);

      // Delete affiliate
      const { error } = await supabase
        .from('affiliates')
        .delete()
        .eq('id', affiliate.id);

      if (error) throw error;

      toast.success('Afiliado removido com sucesso!');
      loadData();
    } catch (error) {
      console.error('Error deleting affiliate:', error);
      toast.error('Erro ao remover afiliado');
    }
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      pending: { label: 'Pendente', className: 'bg-warning/20 text-warning border-warning/30', icon: <Clock className="h-3 w-3" /> },
      approved: { label: 'Aprovado', className: 'bg-success/20 text-success border-success/30', icon: <CheckCircle className="h-3 w-3" /> },
      rejected: { label: 'Rejeitado', className: 'bg-destructive/20 text-destructive border-destructive/30', icon: <XCircle className="h-3 w-3" /> },
      inactive: { label: 'Inativo', className: 'bg-muted text-muted-foreground border-muted', icon: <XCircle className="h-3 w-3" /> },
    };
    const config = configs[status] || { label: status, className: 'bg-muted', icon: null };
    return (
      <Badge className={`${config.className} border flex items-center gap-1`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const pendingAffiliates = affiliates.filter(a => a.status === 'pending');
  const approvedAffiliates = affiliates.filter(a => a.status === 'approved');
  const otherAffiliates = affiliates.filter(a => a.status !== 'pending' && a.status !== 'approved');

  const filteredPending = pendingAffiliates.filter(a =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredApproved = approvedAffiliates.filter(a =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOthers = otherAffiliates.filter(a =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLeads = allLeads.filter(lead =>
    lead.lead_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.lead_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.affiliate_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate totals
  const totalClicks = Object.values(stats).reduce((sum, s) => sum + s.clicks, 0);
  const totalLeads = Object.values(stats).reduce((sum, s) => sum + s.leads, 0);
  const totalConversions = Object.values(stats).reduce((sum, s) => sum + s.conversions, 0);
  const totalPending = Object.values(stats).reduce((sum, s) => sum + s.pending_rewards, 0);
  const totalPaid = Object.values(stats).reduce((sum, s) => sum + s.paid_rewards, 0);

  if (loading) {
    return (
      <DashboardLayout title="Afiliados" subtitle="Carregando...">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Afiliados" subtitle="Gerencie os afiliados externos do programa de indicações">
      <div className="space-y-6">
        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
        >
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                  <p className="text-xl font-bold">{pendingAffiliates.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Aprovados</p>
                  <p className="text-xl font-bold">{approvedAffiliates.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <MousePointerClick className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cliques</p>
                  <p className="text-xl font-bold">{totalClicks}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Leads</p>
                  <p className="text-xl font-bold">{totalLeads}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">A Pagar</p>
                  <p className="text-lg font-bold">{formatCurrency(totalPending)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pagos</p>
                  <p className="text-lg font-bold">{formatCurrency(totalPaid)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Affiliate Registration Link */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="glass-card border-primary/30">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Link2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Link de Cadastro de Afiliados</p>
                    <p className="text-xs text-muted-foreground">Compartilhe este link para novos afiliados se cadastrarem</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="flex-1 sm:flex-initial bg-secondary/30 rounded-lg px-3 py-2 text-sm font-mono truncate max-w-[350px]">
                    https://www.assinaturaspcon.sbs/afiliados/cadastro
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText('https://www.assinaturaspcon.sbs/afiliados/cadastro');
                      toast.success('Link copiado!');
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open('https://www.assinaturaspcon.sbs/afiliados/cadastro', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs defaultValue="pending" className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <TabsList className="glass-card">
                <TabsTrigger value="pending" className="relative">
                  Pendentes
                  {pendingAffiliates.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-warning text-warning-foreground text-xs rounded-full flex items-center justify-center">
                      {pendingAffiliates.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="approved">Aprovados ({approvedAffiliates.length})</TabsTrigger>
                <TabsTrigger value="leads" className="relative">
                  Leads
                  {allLeads.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                      {allLeads.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="others">Outros ({otherAffiliates.length})</TabsTrigger>
              </TabsList>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar afiliado..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Pending Tab */}
            <TabsContent value="pending">
              <Card className="glass-card">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>PIX</TableHead>
                        <TableHead>Cadastro</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPending.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Nenhum afiliado pendente
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPending.map((affiliate) => (
                          <TableRow key={affiliate.id}>
                            <TableCell className="font-medium">{affiliate.name}</TableCell>
                            <TableCell>{affiliate.email}</TableCell>
                            <TableCell>{affiliate.phone || '-'}</TableCell>
                            <TableCell>
                              {affiliate.pix_key ? (
                                <span className="text-xs bg-secondary/50 px-2 py-1 rounded">
                                  {affiliate.pix_key.length > 20 
                                    ? affiliate.pix_key.substring(0, 20) + '...' 
                                    : affiliate.pix_key}
                                </span>
                              ) : '-'}
                            </TableCell>
                            <TableCell>{formatDate(affiliate.created_at)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-success hover:bg-success/10"
                                  onClick={() => openConfirmDialog('approve', affiliate)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Aprovar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive hover:bg-destructive/10"
                                  onClick={() => openConfirmDialog('reject', affiliate)}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Rejeitar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    if (confirm(`Tem certeza que deseja excluir o afiliado "${affiliate.name}"?`)) {
                                      handleDeleteAffiliate(affiliate);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Approved Tab */}
            <TabsContent value="approved">
              <Card className="glass-card">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Link</TableHead>
                        <TableHead>Cliques</TableHead>
                        <TableHead>Leads</TableHead>
                        <TableHead>Conversões</TableHead>
                        <TableHead>A Pagar</TableHead>
                        <TableHead>Pago</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredApproved.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            Nenhum afiliado aprovado
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredApproved.map((affiliate) => {
                          const link = links.find(l => l.affiliate_id === affiliate.id);
                          const affiliateStats = stats[affiliate.id] || { clicks: 0, leads: 0, conversions: 0, pending_rewards: 0, paid_rewards: 0 };
                          
                          return (
                            <TableRow key={affiliate.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{affiliate.name}</p>
                                  <p className="text-xs text-muted-foreground">{affiliate.email}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                {link ? (
                                  <code className="text-xs bg-secondary/50 px-2 py-1 rounded">
                                    /a/{link.slug}
                                  </code>
                                ) : (
                                  <span className="text-muted-foreground text-xs">-</span>
                                )}</TableCell>
                              <TableCell>{affiliateStats.clicks}</TableCell>
                              <TableCell>{affiliateStats.leads}</TableCell>
                              <TableCell>
                                <span className="text-success font-medium">{affiliateStats.conversions}</span>
                              </TableCell>
                              <TableCell>
                                <span className="text-warning font-medium">
                                  {formatCurrency(affiliateStats.pending_rewards)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="text-success font-medium">
                                  {formatCurrency(affiliateStats.paid_rewards)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="icon" variant="ghost">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => {
                                      setSelectedAffiliate(affiliate);
                                      setIsDetailsOpen(true);
                                    }}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      Ver Detalhes
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleToggleActive(affiliate)}>
                                      <UserX className="h-4 w-4 mr-2" />
                                      Desativar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => {
                                        if (confirm(`Tem certeza que deseja excluir o afiliado "${affiliate.name}"? Esta ação não pode ser desfeita.`)) {
                                          handleDeleteAffiliate(affiliate);
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Excluir
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Leads Tab */}
            <TabsContent value="leads">
              <Card className="glass-card">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lead</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Afiliado</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Expira em</TableHead>
                        <TableHead>Cadastrado em</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeads.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            Nenhum lead encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredLeads.map((lead) => {
                          const isExpired = new Date(lead.expires_at) < new Date();
                          const phoneClean = lead.lead_phone?.replace(/\D/g, '') || '';
                          const whatsappUrl = phoneClean ? `https://wa.me/55${phoneClean}?text=${encodeURIComponent(`Olá ${lead.lead_name}! Tudo bem? Você foi indicado por ${lead.affiliate_name} e gostaríamos de conversar sobre nossos serviços.`)}` : null;
                          
                          return (
                            <TableRow key={lead.id}>
                              <TableCell>
                                <div className="font-medium">{lead.lead_name}</div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  {lead.lead_email && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Mail className="h-3 w-3" />
                                      {lead.lead_email}
                                    </div>
                                  )}
                                  {lead.lead_phone && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Phone className="h-3 w-3" />
                                      {lead.lead_phone}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">{lead.affiliate_name}</span>
                              </TableCell>
                              <TableCell>
                                {lead.is_converted ? (
                                  <Badge className="bg-success/20 text-success border-success/30 border">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Convertido
                                  </Badge>
                                ) : isExpired ? (
                                  <Badge className="bg-destructive/20 text-destructive border-destructive/30 border">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Expirado
                                  </Badge>
                                ) : (
                                  <Badge className="bg-warning/20 text-warning border-warning/30 border">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Ativo
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className={isExpired ? 'text-destructive' : 'text-muted-foreground'}>
                                  {formatDate(lead.expires_at)}
                                </span>
                              </TableCell>
                              <TableCell>{formatDate(lead.created_at)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {whatsappUrl && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="bg-green-500/10 hover:bg-green-500/20 border-green-500/30 text-green-500"
                                      onClick={() => window.open(whatsappUrl, '_blank')}
                                    >
                                      <svg viewBox="0 0 24 24" className="h-4 w-4 mr-1 fill-current">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                      </svg>
                                      WhatsApp
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => {
                                      if (confirm('Tem certeza que deseja remover este lead?')) {
                                        handleDeleteLead(lead.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="others">
              <Card className="glass-card">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Cadastro</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOthers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Nenhum afiliado encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredOthers.map((affiliate) => (
                          <TableRow key={affiliate.id}>
                            <TableCell className="font-medium">{affiliate.name}</TableCell>
                            <TableCell>{affiliate.email}</TableCell>
                            <TableCell>{getStatusBadge(affiliate.status)}</TableCell>
                            <TableCell>{formatDate(affiliate.created_at)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {affiliate.status === 'inactive' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleToggleActive(affiliate)}
                                  >
                                    <UserCheck className="h-4 w-4 mr-1" />
                                    Reativar
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    if (confirm(`Tem certeza que deseja excluir o afiliado "${affiliate.name}"?`)) {
                                      handleDeleteAffiliate(affiliate);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.type === 'approve' ? 'Aprovar Afiliado' : 'Rejeitar Afiliado'}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.type === 'approve' 
                ? `Deseja aprovar ${confirmAction?.affiliate.name}? Um link de indicação será criado automaticamente.`
                : `Deseja rejeitar ${confirmAction?.affiliate.name}? Esta pessoa não poderá acessar o sistema.`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant={confirmAction?.type === 'approve' ? 'default' : 'destructive'}
              onClick={() => {
                if (confirmAction?.type === 'approve') {
                  handleApprove(confirmAction.affiliate);
                } else if (confirmAction) {
                  handleReject(confirmAction.affiliate);
                }
              }}
            >
              {confirmAction?.type === 'approve' ? 'Aprovar' : 'Rejeitar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Afiliado</DialogTitle>
          </DialogHeader>
          {selectedAffiliate && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{selectedAffiliate.name}</h3>
                  {getStatusBadge(selectedAffiliate.status)}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedAffiliate.email}</span>
                </div>
                {selectedAffiliate.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedAffiliate.phone}</span>
                  </div>
                )}
                {selectedAffiliate.pix_key && (
                  <div className="flex items-center gap-3 text-sm">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <span className="break-all">{selectedAffiliate.pix_key}</span>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3">Estatísticas</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary/30 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Cliques</p>
                    <p className="text-lg font-bold">{stats[selectedAffiliate.id]?.clicks || 0}</p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Leads</p>
                    <p className="text-lg font-bold">{stats[selectedAffiliate.id]?.leads || 0}</p>
                  </div>
                  <div className="bg-success/10 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Conversões</p>
                    <p className="text-lg font-bold text-success">{stats[selectedAffiliate.id]?.conversions || 0}</p>
                  </div>
                  <div className="bg-warning/10 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">A Pagar</p>
                    <p className="text-lg font-bold text-warning">
                      {formatCurrency(stats[selectedAffiliate.id]?.pending_rewards || 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Cadastrado em {formatDate(selectedAffiliate.created_at)}
                {selectedAffiliate.approved_at && (
                  <> • Aprovado em {formatDate(selectedAffiliate.approved_at)}</>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Affiliates;
