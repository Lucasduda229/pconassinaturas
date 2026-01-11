import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAffiliateAuth } from '@/contexts/AffiliateAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { 
  Loader2, LogOut, Link as LinkIcon, MousePointer, Users, 
  DollarSign, Copy, Share2, Send, Facebook, Twitter 
} from 'lucide-react';
import logo from '@/assets/logo-pcon-grande.png';
import BlueBackground from '@/components/BlueBackground';

interface AffiliateStats {
  link: string | null;
  slug: string | null;
  clicks: number;
  leads: number;
  conversions: number;
  pendingRewards: number;
  paidRewards: number;
}

const AffiliateDashboard = () => {
  const { affiliate, isLoading: authLoading, isAuthenticated, logout } = useAffiliateAuth();
  const [stats, setStats] = useState<AffiliateStats>({
    link: null,
    slug: null,
    clicks: 0,
    leads: 0,
    conversions: 0,
    pendingRewards: 0,
    paidRewards: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const AFFILIATE_DOMAIN = 'https://assinaturaspcon.sbs';

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/afiliado');
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (affiliate) {
      loadStats();
    }
  }, [affiliate]);

  const loadStats = async () => {
    if (!affiliate) return;
    
    setIsLoading(true);
    try {
      // Get affiliate link
      const { data: linkData } = await supabase
        .from('affiliate_links')
        .select('*')
        .eq('affiliate_id', affiliate.id)
        .maybeSingle();

      if (!linkData) {
        setStats({
          link: null,
          slug: null,
          clicks: 0,
          leads: 0,
          conversions: 0,
          pendingRewards: 0,
          paidRewards: 0,
        });
        setIsLoading(false);
        return;
      }

      const fullLink = `${AFFILIATE_DOMAIN}/a/${linkData.slug}`;

      // Get clicks count
      const { count: clicksCount } = await supabase
        .from('affiliate_clicks')
        .select('*', { count: 'exact', head: true })
        .eq('affiliate_link_id', linkData.id);

      // Get leads
      const { data: leadsData } = await supabase
        .from('affiliate_leads')
        .select('*')
        .eq('affiliate_link_id', linkData.id);

      const leads = leadsData || [];
      const conversions = leads.filter(l => l.is_converted).length;

      // Get rewards
      const { data: rewardsData } = await supabase
        .from('affiliate_rewards')
        .select('*')
        .eq('affiliate_link_id', linkData.id);

      const rewards = rewardsData || [];
      const pendingRewards = rewards
        .filter(r => r.status === 'pending' || r.status === 'approved')
        .reduce((sum, r) => sum + Number(r.amount), 0);
      const paidRewards = rewards
        .filter(r => r.status === 'paid')
        .reduce((sum, r) => sum + Number(r.amount), 0);

      setStats({
        link: fullLink,
        slug: linkData.slug,
        clicks: clicksCount || 0,
        leads: leads.length,
        conversions,
        pendingRewards,
        paidRewards,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (stats.link) {
      navigator.clipboard.writeText(stats.link);
      toast.success('Link copiado!');
    }
  };

  const handleShare = (platform: string) => {
    if (!stats.link) return;
    
    const text = encodeURIComponent('Conheça a P-CON! Serviços contábeis de qualidade.');
    const url = encodeURIComponent(stats.link);
    
    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      telegram: `https://t.me/share/url?url=${url}&text=${text}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
    };

    window.open(urls[platform], '_blank');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/afiliado');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen relative">
      <BlueBackground />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div 
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-4">
            <img src={logo} alt="P-CON" className="h-12" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Olá, {affiliate?.name.split(' ')[0]}!</h1>
              <p className="text-sm text-muted-foreground">Painel do Afiliado</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Link Card */}
            {stats.link ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <LinkIcon className="h-5 w-5 text-primary" />
                      Seu Link de Indicação
                    </CardTitle>
                    <CardDescription>
                      Compartilhe este link para ganhar recompensas
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-3 bg-secondary/50 rounded-lg text-sm break-all">
                        {stats.link}
                      </code>
                      <Button size="icon" variant="outline" onClick={handleCopyLink}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Share Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="bg-green-500/10 hover:bg-green-500/20 border-green-500/30"
                        onClick={() => handleShare('whatsapp')}
                      >
                        <Share2 className="h-4 w-4 mr-2 text-green-500" />
                        WhatsApp
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30"
                        onClick={() => handleShare('telegram')}
                      >
                        <Send className="h-4 w-4 mr-2 text-blue-500" />
                        Telegram
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="bg-blue-600/10 hover:bg-blue-600/20 border-blue-600/30"
                        onClick={() => handleShare('facebook')}
                      >
                        <Facebook className="h-4 w-4 mr-2 text-blue-600" />
                        Facebook
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="bg-foreground/10 hover:bg-foreground/20 border-foreground/30"
                        onClick={() => handleShare('twitter')}
                      >
                        <Twitter className="h-4 w-4 mr-2" />
                        X
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="glass-card">
                  <CardContent className="py-8 text-center">
                    <LinkIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Seu link de indicação será gerado em breve.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Stats Grid */}
            <motion.div 
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Cliques</p>
                      <p className="text-2xl font-bold">{stats.clicks}</p>
                    </div>
                    <MousePointer className="h-8 w-8 text-primary/50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Leads</p>
                      <p className="text-2xl font-bold">{stats.leads}</p>
                    </div>
                    <Users className="h-8 w-8 text-primary/50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pendente</p>
                      <p className="text-2xl font-bold text-yellow-500">
                        R$ {stats.pendingRewards.toFixed(0)}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-yellow-500/50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Recebido</p>
                      <p className="text-2xl font-bold text-green-500">
                        R$ {stats.paidRewards.toFixed(0)}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500/50" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="glass-card bg-primary/5">
                <CardContent className="py-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <DollarSign className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Como funciona?</h3>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>1. Compartilhe seu link com pessoas interessadas</li>
                        <li>2. Quando elas preencherem o formulário, você ganha um lead</li>
                        <li>3. Se o lead virar cliente, você recebe a recompensa!</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AffiliateDashboard;
