import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, User, Mail, Phone, Send, CheckCircle2, Gift } from 'lucide-react';
import logo from '@/assets/logo-pcon-grande.png';
import BlueBackground from '@/components/BlueBackground';
import { z } from 'zod';

const leadSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
});

const AffiliateLanding = () => {
  const { slug } = useParams<{ slug: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [linkId, setLinkId] = useState<string | null>(null);
  const [affiliateName, setAffiliateName] = useState<string>('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validityDays, setValidityDays] = useState(60);
  const [rewardValue, setRewardValue] = useState(100);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (slug) {
      validateLink();
      trackClick();
    }
  }, [slug]);

  const validateLink = async () => {
    try {
      // Get affiliate link
      const { data: linkData, error: linkError } = await supabase
        .from('affiliate_links')
        .select('*, affiliates(*)')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (linkError || !linkData) {
        setIsValid(false);
        setIsLoading(false);
        return;
      }

      // Check if affiliate is approved
      if (linkData.affiliates?.status !== 'approved') {
        setIsValid(false);
        setIsLoading(false);
        return;
      }

      setLinkId(linkData.id);
      setAffiliateName(linkData.affiliates?.name?.split(' ')[0] || '');
      setIsValid(true);

      // Get referral settings for validity days
      const { data: settings } = await supabase
        .from('referral_settings')
        .select('validity_days, reward_value')
        .limit(1)
        .maybeSingle();

      if (settings) {
        setValidityDays(settings.validity_days);
        setRewardValue(settings.reward_value);
      }
    } catch (error) {
      console.error('Error validating link:', error);
      setIsValid(false);
    } finally {
      setIsLoading(false);
    }
  };

  const trackClick = async () => {
    if (!slug) return;
    
    try {
      const { data: linkData } = await supabase
        .from('affiliate_links')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (linkData) {
        await supabase.from('affiliate_clicks').insert({
          affiliate_link_id: linkData.id,
          user_agent: navigator.userAgent,
          referer: document.referrer || null,
        });
      }
    } catch (error) {
      console.error('Error tracking click:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = leadSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    if (!linkId) {
      toast.error('Link inválido');
      return;
    }

    setIsSubmitting(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + validityDays);

      const { error } = await supabase.from('affiliate_leads').insert({
        affiliate_link_id: linkId,
        lead_name: formData.name.trim(),
        lead_email: formData.email?.trim() || null,
        lead_phone: formData.phone?.trim() || null,
        source: 'affiliate_form',
        expires_at: expiresAt.toISOString(),
      });

      if (error) {
        console.error('Error submitting lead:', error);
        toast.error('Erro ao enviar. Tente novamente.');
        return;
      }

      setSubmitted(true);
      toast.success('Cadastro realizado com sucesso!');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao enviar. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <BlueBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary relative z-10" />
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <BlueBackground />
        <Card className="glass-card max-w-md w-full relative z-10">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-destructive/10 rounded-full flex items-center justify-center">
              <span className="text-3xl">❌</span>
            </div>
            <h2 className="text-xl font-bold mb-2">Link Inválido</h2>
            <p className="text-muted-foreground">
              Este link de indicação não existe ou está inativo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <BlueBackground />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10"
        >
          <Card className="glass-card max-w-md w-full">
            <CardContent className="py-12 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-20 h-20 mx-auto mb-6 bg-green-500/10 rounded-full flex items-center justify-center"
              >
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </motion.div>
              <h2 className="text-2xl font-bold mb-2">Cadastro Realizado!</h2>
              <p className="text-muted-foreground mb-4">
                Obrigado pelo seu interesse. Em breve entraremos em contato!
              </p>
              <div className="p-4 bg-primary/10 rounded-xl">
                <Gift className="h-6 w-6 mx-auto text-primary mb-2" />
                <p className="text-sm text-foreground/80">
                  Você foi indicado por <strong>{affiliateName}</strong>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <BlueBackground />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="glass-card">
          <CardHeader className="text-center">
            <motion.div 
              className="flex justify-center mb-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <img src={logo} alt="P-CON" className="h-20" />
            </motion.div>
            <CardTitle className="text-2xl">
              {affiliateName ? `${affiliateName} indicou você!` : 'Você foi indicado!'}
            </CardTitle>
            <CardDescription>
              Preencha seus dados para conhecer nossos serviços contábeis
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="name"
                    name="name"
                    placeholder="Seu nome"
                    value={formData.name}
                    onChange={handleChange}
                    className="pl-12 h-12"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-12 h-12"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={formData.phone}
                    onChange={handleChange}
                    className="pl-12 h-12"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 btn-blue"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Enviando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Quero Conhecer
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AffiliateLanding;
