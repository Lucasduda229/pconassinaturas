import { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import {
  Link2,
  MousePointerClick,
  Users,
  DollarSign,
  CheckCircle,
  Clock,
  Settings,
  ToggleLeft,
  ToggleRight,
  Search,
  Copy,
  ExternalLink,
  UserCheck,
  TrendingUp,
  Gift,
  AlertCircle,
  Trash2,
  Phone,
  Mail,
  Wand2,
  Percent,
  ArrowRight,
  FileText,
  MessageSquare,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useReferrals, ReferralLead, ReferralReward } from '@/hooks/useReferrals';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { supabase } from '@/integrations/supabase/client';


const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (date: string) => {
  return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
};

const Referrals = () => {
  const { clients } = useGlobalData();
  const {
    settings,
    links,
    clicks,
    leads,
    rewards,
    stats,
    loading,
    updateSettings,
    createLink,
    toggleLinkActive,
    updateRewardStatus,
    convertLead,
    deleteLink,
    deleteLead,
    deleteReward,
    createLinksForAllClients,
    createManualReward,
  } = useReferrals();

  const [searchTerm, setSearchTerm] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateLinkOpen, setIsCreateLinkOpen] = useState(false);
  const [isCreateRewardOpen, setIsCreateRewardOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [rewardClientId, setRewardClientId] = useState<string>('');
  const [rewardAmount, setRewardAmount] = useState<string>('');
  const [rewardTypeCategory, setRewardTypeCategory] = useState<'cash' | 'coupon'>('cash');
  const [rewardDescription, setRewardDescription] = useState<string>('');
  const [tempSettings, setTempSettings] = useState({
    reward_value: 100,
    client_reward_value: 150,
    client_reward_description: 'Cupom de desconto para projetos futuros',
    validity_days: 60,
  });

  // Clients without referral links
  const clientsWithoutLinks = clients.filter(
    (client) => !links.some((link) => link.client_id === client.id)
  );

  const REFERRAL_DOMAIN = 'https://www.assinaturaspcon.sbs';

  // Helper to get or create coupon for a reward
  const getOrCreateCouponForReward = async (reward: ReferralReward): Promise<string | null> => {
    try {
      // 1) Try to find the coupon linked to this reward
      const { data: existing, error: existingError } = await (supabase as any)
        .from('client_coupons')
        .select('id')
        .eq('referral_reward_id', reward.id)
        .maybeSingle();

      if (existingError) throw existingError;

      let couponId = (existing as any)?.id as string | undefined;

      // 2) If missing (old data), create it now so the public receipt resolves
      if (!couponId) {
        const clientId = reward.referral_link?.client_id;
        if (!clientId) {
          toast.error('Não foi possível identificar o cliente desta recompensa');
          return null;
        }

        const amount = Number(reward.amount || 0);
        const description = reward.description || settings?.client_reward_description || 'Cupom de desconto para projetos futuros';

        const { data: created, error: createError } = await (supabase as any)
          .from('client_coupons')
          .insert({
            client_id: clientId,
            initial_amount: amount,
            current_balance: amount,
            description,
            status: 'active',
            origin: 'referral',
            referral_reward_id: reward.id,
          })
          .select('id')
          .maybeSingle();

        if (createError) throw createError;

        couponId = (created as any)?.id;
      }

      return couponId || null;
    } catch (e) {
      console.error('Error getting/creating coupon:', e);
      return null;
    }
  };

  const copyCouponReceiptLinkFromReward = async (reward: ReferralReward) => {
    const couponId = await getOrCreateCouponForReward(reward);
    if (!couponId) {
      toast.error('Não foi possível gerar o cupom desta recompensa');
      return;
    }

    const url = `${REFERRAL_DOMAIN}/${couponId}`;
    await navigator.clipboard.writeText(url);
    toast.success('Link do comprovante copiado!');
  };

  const openWhatsAppWithCouponReceipt = async (reward: ReferralReward) => {
    try {
      const couponId = await getOrCreateCouponForReward(reward);
      if (!couponId) {
        toast.error('Não foi possível gerar o cupom desta recompensa');
        return;
      }

      // Get client phone
      const clientId = reward.referral_link?.client_id;
      const client = clients.find(c => c.id === clientId);
      
      if (!client?.phone) {
        toast.error('Cliente não possui telefone cadastrado');
        return;
      }

      const amount = Number(reward.amount || 0);
      const receiptUrl = `${REFERRAL_DOMAIN}/${couponId}`;
      
      const message = `🎉 *PARABÉNS! CUPOM DE DESCONTO LIBERADO!*

Você recebeu um cupom de *${formatCurrency(amount)}* através do nosso Programa de Indicação!

📋 *Detalhes:*
• Valor: ${formatCurrency(amount)}
• Saldo disponível: ${formatCurrency(amount)}
• Validade: Uso em projetos futuros

🔗 *Acesse seu comprovante:*
${receiptUrl}

Obrigado por fazer parte da família P-CON! 💙`;

      // Format phone for wa.me (remove non-digits)
      let formattedPhone = client.phone.replace(/\D/g, '');
      if (!formattedPhone.startsWith('55')) {
        formattedPhone = '55' + formattedPhone;
      }

      // Open WhatsApp with pre-filled message
      const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');
      
      toast.success('WhatsApp aberto!');
    } catch (e) {
      console.error('Error opening WhatsApp:', e);
      toast.error('Erro ao abrir WhatsApp');
    }
  };

  const handleCopyLink = (slug: string) => {
    const url = `${REFERRAL_DOMAIN}/r/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  const handleToggleSystem = async () => {
    if (settings) {
      await updateSettings({ is_active: !settings.is_active });
    }
  };

  const handleSaveSettings = async () => {
    await updateSettings(tempSettings);
    setIsSettingsOpen(false);
  };

  const handleCreateLink = async () => {
    if (!selectedClientId) {
      toast.error('Selecione um cliente');
      return;
    }
    await createLink(selectedClientId);
    setIsCreateLinkOpen(false);
    setSelectedClientId('');
  };

  const handleCreateAllLinks = async () => {
    const clientIds = clientsWithoutLinks.map(c => c.id);
    await createLinksForAllClients(clientIds);
  };

  const handleCreateManualReward = async () => {
    if (!rewardClientId) {
      toast.error('Selecione um cliente');
      return;
    }
    const defaultAmount = rewardTypeCategory === 'coupon' 
      ? (settings?.client_reward_value || 150) 
      : (settings?.reward_value || 100);
    const amount = parseFloat(rewardAmount) || defaultAmount;
    const fullDescription = rewardDescription || 'Indicação externa';
    await createManualReward(rewardClientId, amount, fullDescription, rewardTypeCategory);
    setIsCreateRewardOpen(false);
    setRewardClientId('');
    setRewardAmount('');
    setRewardTypeCategory('cash');
    setRewardDescription('');
  };

  const getRewardTypeBadge = (type: 'cash' | 'coupon') => {
    if (type === 'coupon') {
      return (
        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 border text-xs">
          Cupom
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 border text-xs">
        Dinheiro
      </Badge>
    );
  };

  const getRewardStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      pending: { label: 'Pendente', className: 'bg-warning/20 text-warning border-warning/30' },
      approved: { label: 'Aprovado', className: 'bg-primary/20 text-primary border-primary/30' },
      paid: { label: 'Pago', className: 'bg-success/20 text-success border-success/30' },
    };
    const config = configs[status] || { label: status, className: 'bg-muted' };
    return <Badge className={`${config.className} border`}>{config.label}</Badge>;
  };

  const generateCouponPDF = (reward: ReferralReward) => {
    const doc = new jsPDF();
    const clientName = reward.referral_link?.client?.name || 'Cliente';
    const leadName = reward.referral_lead?.lead_name || 'Lead';
    const amount = Number(reward.amount);
    const createdDate = format(new Date(reward.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    const paidDate = reward.paid_at 
      ? format(new Date(reward.paid_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
      : '-';

    // Header
    doc.setFillColor(20, 30, 50);
    doc.rect(0, 0, 210, 50, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('P-CON CONSTRUNET', 105, 25, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('COMPROVANTE DE CUPOM DE INDICAÇÃO', 105, 38, { align: 'center' });

    // Content
    doc.setTextColor(50, 50, 50);
    
    // Box with info
    doc.setDrawColor(100, 100, 200);
    doc.setLineWidth(0.5);
    doc.roundedRect(20, 60, 170, 100, 5, 5);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALHES DO CUPOM', 105, 75, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    let y = 90;
    const lineHeight = 10;

    doc.setFont('helvetica', 'bold');
    doc.text('Indicador:', 30, y);
    doc.setFont('helvetica', 'normal');
    doc.text(clientName, 80, y);
    y += lineHeight;

    doc.setFont('helvetica', 'bold');
    doc.text('Lead Convertido:', 30, y);
    doc.setFont('helvetica', 'normal');
    doc.text(leadName, 80, y);
    y += lineHeight;

    doc.setFont('helvetica', 'bold');
    doc.text('Tipo:', 30, y);
    doc.setFont('helvetica', 'normal');
    doc.text(reward.reward_type === 'coupon' ? 'Cupom de Desconto' : 'Dinheiro (PIX)', 80, y);
    y += lineHeight;

    doc.setFont('helvetica', 'bold');
    doc.text('Valor:', 30, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 150, 50);
    doc.text(formatCurrency(amount), 80, y);
    doc.setTextColor(50, 50, 50);
    y += lineHeight;

    doc.setFont('helvetica', 'bold');
    doc.text('Data Criação:', 30, y);
    doc.setFont('helvetica', 'normal');
    doc.text(createdDate, 80, y);
    y += lineHeight;

    if (reward.status === 'paid') {
      doc.setFont('helvetica', 'bold');
      doc.text('Data Pagamento:', 30, y);
      doc.setFont('helvetica', 'normal');
      doc.text(paidDate, 80, y);
    }

    // Description box
    if (reward.description || reward.reward_type === 'coupon') {
      y = 175;
      doc.setFillColor(240, 240, 255);
      doc.roundedRect(20, y, 170, 30, 3, 3, 'F');
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Descrição:', 30, y + 12);
      doc.setFont('helvetica', 'normal');
      doc.text(reward.description || 'Cupom de desconto para projetos futuros', 30, y + 22);
    }

    // Status badge
    const statusY = 220;
    if (reward.status === 'paid') {
      doc.setFillColor(0, 180, 100);
    } else if (reward.status === 'approved') {
      doc.setFillColor(50, 100, 200);
    } else {
      doc.setFillColor(200, 150, 50);
    }
    doc.roundedRect(70, statusY, 70, 15, 3, 3, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    const statusText = reward.status === 'paid' ? 'PAGO' : reward.status === 'approved' ? 'APROVADO' : 'PENDENTE';
    doc.text(statusText, 105, statusY + 10, { align: 'center' });

    // Footer
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Este cupom pode ser utilizado em projetos e serviços futuros da P-CON Construnet.', 105, 250, { align: 'center' });
    doc.text('Documento gerado automaticamente pelo sistema.', 105, 258, { align: 'center' });
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 105, 266, { align: 'center' });

    // Save
    doc.save(`comprovante-cupom-${clientName.replace(/\s+/g, '-').toLowerCase()}-${leadName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    toast.success('PDF gerado com sucesso!');
  };

  const filteredLinks = links.filter((link) =>
    link.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    link.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLeads = leads.filter((lead) =>
    lead.lead_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.lead_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRewards = rewards.filter((reward) =>
    reward.referral_link?.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reward.referral_lead?.lead_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <DashboardLayout title="Sistema de Indicação" subtitle="Carregando...">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Sistema de Indicação" subtitle="Gerencie o programa de indicações e recompensas">
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">
              Sistema de Indicação
            </h1>
            <p className="text-muted-foreground text-sm">
              Gerencie o programa de indicações e recompensas
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sistema:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleSystem}
                className={settings?.is_active ? 'text-success' : 'text-muted-foreground'}
              >
                {settings?.is_active ? (
                  <>
                    <ToggleRight className="h-5 w-5 mr-1" />
                    Ativo
                  </>
                ) : (
                  <>
                    <ToggleLeft className="h-5 w-5 mr-1" />
                    Inativo
                  </>
                )}
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => {
              setTempSettings({
                reward_value: settings?.reward_value || 100,
                client_reward_value: settings?.client_reward_value || 150,
                client_reward_description: settings?.client_reward_description || 'Cupom de desconto para projetos futuros',
                validity_days: settings?.validity_days || 60,
              });
              setIsSettingsOpen(true);
            }}>
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </Button>
            {clientsWithoutLinks.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCreateAllLinks}
                className="text-xs text-muted-foreground hover:text-primary"
                title={`Criar links para ${clientsWithoutLinks.length} clientes`}
              >
                <Wand2 className="h-3 w-3 mr-1" />
                +{clientsWithoutLinks.length}
              </Button>
            )}
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          {/* Main Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <MousePointerClick className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cliques</p>
                    <p className="text-xl font-bold">{stats.totalClicks}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center">
                    <Users className="h-5 w-5 text-foreground" />
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
                  <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Conversões</p>
                    <p className="text-xl font-bold">{stats.totalConversions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pendentes</p>
                    <p className="text-xl font-bold">{stats.totalPending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pagos</p>
                    <p className="text-xl font-bold">{stats.totalPaid}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">A Pagar</p>
                    <p className="text-xl font-bold">{formatCurrency(stats.totalToPay)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Conversion Rates Row */}
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
                {/* Click to Lead Rate */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MousePointerClick className="h-4 w-4 text-primary" />
                    <span>Cliques</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Leads</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full">
                    <Percent className="h-3.5 w-3.5 text-primary" />
                    <span className="font-bold text-primary">
                      {stats.totalClicks > 0 
                        ? ((stats.totalLeads / stats.totalClicks) * 100).toFixed(1)
                        : '0.0'}%
                    </span>
                  </div>
                </div>

                <div className="hidden sm:block w-px h-8 bg-border" />

                {/* Lead to Conversion Rate */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Leads</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <span>Fechamentos</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-success/10 px-3 py-1.5 rounded-full">
                    <Percent className="h-3.5 w-3.5 text-success" />
                    <span className="font-bold text-success">
                      {stats.totalLeads > 0 
                        ? ((stats.totalConversions / stats.totalLeads) * 100).toFixed(1)
                        : '0.0'}%
                    </span>
                  </div>
                </div>

                <div className="hidden sm:block w-px h-8 bg-border" />

                {/* Overall Conversion Rate */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MousePointerClick className="h-4 w-4 text-primary" />
                    <span>Cliques</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <span>Fechamentos</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-accent/50 px-3 py-1.5 rounded-full">
                    <Percent className="h-3.5 w-3.5 text-foreground" />
                    <span className="font-bold text-foreground">
                      {stats.totalClicks > 0 
                        ? ((stats.totalConversions / stats.totalClicks) * 100).toFixed(1)
                        : '0.0'}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="links" className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <TabsList className="glass-card">
                <TabsTrigger value="links">Links ({links.length})</TabsTrigger>
                <TabsTrigger value="leads">Leads ({leads.length})</TabsTrigger>
                <TabsTrigger value="rewards">Recompensas ({rewards.length})</TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" onClick={() => setIsCreateRewardOpen(true)}>
                  <Gift className="h-4 w-4 mr-2" />
                  Nova Recompensa
                </Button>
                <Button onClick={() => setIsCreateLinkOpen(true)}>
                  <Link2 className="h-4 w-4 mr-2" />
                  Novo Link
                </Button>
              </div>
            </div>

            {/* Links Tab */}
            <TabsContent value="links">
              <Card className="glass-card">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>Cliques</TableHead>
                        <TableHead>Leads</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Criado em</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLinks.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            Nenhum link de indicação encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredLinks.map((link) => {
                          const linkClicks = clicks.filter(c => c.referral_link_id === link.id).length;
                          const linkLeads = leads.filter(l => l.referral_link_id === link.id).length;
                          
                          return (
                            <TableRow key={link.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{link.client?.name || 'N/A'}</p>
                                  <p className="text-xs text-muted-foreground">{link.client?.email}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <code className="text-xs bg-muted px-2 py-1 rounded">/r/{link.slug}</code>
                              </TableCell>
                              <TableCell>{linkClicks}</TableCell>
                              <TableCell>{linkLeads}</TableCell>
                              <TableCell>
                                <Badge className={link.is_active 
                                  ? 'bg-success/20 text-success border-success/30 border' 
                                  : 'bg-muted text-muted-foreground border'
                                }>
                                  {link.is_active ? 'Ativo' : 'Inativo'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatDate(link.created_at)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCopyLink(link.slug)}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleLinkActive(link.id, !link.is_active)}
                                  >
                                    {link.is_active ? (
                                      <ToggleRight className="h-4 w-4 text-success" />
                                    ) : (
                                      <ToggleLeft className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => {
                                      if (confirm('Tem certeza que deseja remover este link? Todos os cliques, leads e recompensas associados serão removidos.')) {
                                        deleteLink(link.id);
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

            {/* Leads Tab */}
            <TabsContent value="leads">
              <Card className="glass-card">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lead</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Indicador</TableHead>
                        <TableHead>Origem</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Expira em</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeads.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            Nenhum lead encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredLeads.map((lead) => {
                          const isExpired = new Date(lead.expires_at) < new Date();
                          
                          return (
                            <TableRow key={lead.id}>
                            <TableCell>
                              <p className="font-medium">{lead.lead_name}</p>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {lead.lead_email && (
                                  <a 
                                    href={`mailto:${lead.lead_email}`}
                                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    <Mail className="h-3 w-3" />
                                    {lead.lead_email}
                                  </a>
                                )}
                                {lead.lead_phone && (
                                  <a 
                                    href={`https://wa.me/55${lead.lead_phone.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-xs text-success hover:text-success/80 transition-colors"
                                  >
                                    <Phone className="h-3 w-3" />
                                    {lead.lead_phone}
                                  </a>
                                )}
                                {!lead.lead_email && !lead.lead_phone && (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm">{lead.referral_link?.client?.name || 'N/A'}</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">{lead.source}</Badge>
                            </TableCell>
                              <TableCell>
                                {lead.is_converted ? (
                                  <Badge className="bg-success/20 text-success border-success/30 border">
                                    Convertido
                                  </Badge>
                                ) : isExpired ? (
                                  <Badge className="bg-destructive/20 text-destructive border-destructive/30 border">
                                    Expirado
                                  </Badge>
                                ) : (
                                  <Badge className="bg-warning/20 text-warning border-warning/30 border">
                                    Ativo
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {format(new Date(lead.expires_at), 'dd/MM/yyyy', { locale: ptBR })}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {!lead.is_converted && !isExpired && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => convertLead(lead.id)}
                                    >
                                      <UserCheck className="h-4 w-4 mr-1" />
                                      Fechar Projeto
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => {
                                      if (confirm('Tem certeza que deseja remover este lead?')) {
                                        deleteLead(lead.id);
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

            {/* Rewards Tab */}
            <TabsContent value="rewards">
              <Card className="glass-card">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Indicador</TableHead>
                        <TableHead>Lead Convertido</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Criado em</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRewards.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            Nenhuma recompensa encontrada
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRewards.map((reward) => (
                          <TableRow key={reward.id}>
                            <TableCell>
                              <p className="font-medium">{reward.referral_link?.client?.name || 'N/A'}</p>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm">{reward.referral_lead?.lead_name || 'N/A'}</p>
                                {reward.description && (
                                  <p className="text-xs text-muted-foreground">{reward.description}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {getRewardTypeBadge(reward.reward_type || 'cash')}
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(Number(reward.amount))}
                            </TableCell>
                            <TableCell>{getRewardStatusBadge(reward.status)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(reward.created_at)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {reward.status === 'pending' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateRewardStatus(reward.id, 'approved')}
                                  >
                                    Aprovar
                                  </Button>
                                )}
                                {reward.status === 'approved' && (
                                  <Button
                                    size="sm"
                                    onClick={() => updateRewardStatus(reward.id, 'paid')}
                                  >
                                    <DollarSign className="h-4 w-4 mr-1" />
                                    Marcar Pago
                                  </Button>
                                )}
                                {reward.status === 'paid' && (
                                  <>
                                    {reward.reward_type === 'coupon' && (
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => openWhatsAppWithCouponReceipt(reward)}
                                          className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                                          title="Enviar comprovante via WhatsApp"
                                        >
                                          <MessageSquare className="h-4 w-4" />
                                          <span className="hidden sm:inline">WhatsApp</span>
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => copyCouponReceiptLinkFromReward(reward)}
                                          className="gap-1"
                                          title="Copiar link do comprovante"
                                        >
                                          <Link2 className="h-4 w-4" />
                                          <span className="hidden sm:inline">Link</span>
                                        </Button>
                                      </>
                                    )}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => generateCouponPDF(reward)}
                                      className="gap-1"
                                      title="Baixar PDF"
                                    >
                                      <FileText className="h-4 w-4" />
                                      <span className="hidden sm:inline">PDF</span>
                                    </Button>
                                  </>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    if (confirm('Tem certeza que deseja remover esta recompensa?')) {
                                      deleteReward(reward.id);
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

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações do Sistema
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <h4 className="text-sm font-medium text-green-400 mb-2">💵 Afiliados (Dinheiro)</h4>
              <p className="text-xs text-muted-foreground mb-2">
                Afiliados externos recebem dinheiro em PIX
              </p>
              <div className="space-y-2">
                <Label htmlFor="reward_value">Valor em Dinheiro (R$)</Label>
                <Input
                  id="reward_value"
                  type="number"
                  value={tempSettings.reward_value}
                  onChange={(e) => setTempSettings({ ...tempSettings, reward_value: Number(e.target.value) })}
                />
              </div>
            </div>
            
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <h4 className="text-sm font-medium text-purple-400 mb-2">🎫 Clientes Ativos (Cupom)</h4>
              <p className="text-xs text-muted-foreground mb-2">
                Clientes com assinatura ativa recebem cupom de desconto
              </p>
              <div className="space-y-2">
                <Label htmlFor="client_reward_value">Valor do Cupom (R$)</Label>
                <Input
                  id="client_reward_value"
                  type="number"
                  value={tempSettings.client_reward_value}
                  onChange={(e) => setTempSettings({ ...tempSettings, client_reward_value: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2 mt-2">
                <Label htmlFor="client_reward_description">Descrição do Cupom</Label>
                <Input
                  id="client_reward_description"
                  value={tempSettings.client_reward_description}
                  onChange={(e) => setTempSettings({ ...tempSettings, client_reward_description: e.target.value })}
                  placeholder="Ex: Cupom de desconto para projetos futuros"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="validity_days">Validade da Indicação (dias)</Label>
              <Input
                id="validity_days"
                type="number"
                value={tempSettings.validity_days}
                onChange={(e) => setTempSettings({ ...tempSettings, validity_days: Number(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSettings}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Link Dialog */}
      <Dialog open={isCreateLinkOpen} onOpenChange={setIsCreateLinkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Criar Link de Indicação
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Selecione o Cliente</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientsWithoutLinks.length === 0 ? (
                    <SelectItem value="none" disabled>
                      Todos os clientes já possuem link
                    </SelectItem>
                  ) : (
                    clientsWithoutLinks.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {clientsWithoutLinks.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                Todos os clientes ativos já possuem um link de indicação.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateLinkOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateLink} disabled={clientsWithoutLinks.length === 0}>
              Criar Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Manual Reward Dialog */}
      <Dialog open={isCreateRewardOpen} onOpenChange={setIsCreateRewardOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Criar Recompensa Manual
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Use esta opção para registrar indicações feitas fora do sistema (por fora, boca a boca, etc.)
            </p>
            <div className="space-y-2">
              <Label>Cliente que Indicou *</Label>
              <Select value={rewardClientId} onValueChange={setRewardClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Recompensa *</Label>
              <Select value={rewardTypeCategory} onValueChange={(v) => setRewardTypeCategory(v as 'cash' | 'coupon')}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">💵</span>
                      <span>Dinheiro (R$ {settings?.reward_value || 100})</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="coupon">
                    <div className="flex items-center gap-2">
                      <span className="text-purple-400">🎫</span>
                      <span>Cupom (R$ {settings?.client_reward_value || 150})</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {rewardTypeCategory === 'coupon' 
                  ? 'Cupom de desconto para projetos ou aplicações futuras' 
                  : 'Pagamento em dinheiro via PIX'}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reward_amount">Valor da Recompensa (R$)</Label>
              <Input
                id="reward_amount"
                type="number"
                placeholder={String(rewardTypeCategory === 'coupon' ? (settings?.client_reward_value || 150) : (settings?.reward_value || 100))}
                value={rewardAmount}
                onChange={(e) => setRewardAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco para usar o valor padrão: {formatCurrency(rewardTypeCategory === 'coupon' ? (settings?.client_reward_value || 150) : (settings?.reward_value || 100))}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reward_description">Nome do Indicado (opcional)</Label>
              <Input
                id="reward_description"
                placeholder="Ex: João da Silva"
                value={rewardDescription}
                onChange={(e) => setRewardDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateRewardOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateManualReward}>
              Criar Recompensa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Referrals;
