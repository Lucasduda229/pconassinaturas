import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAffiliateAuth } from '@/contexts/AffiliateAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Lock, Mail, ArrowRight, User, Phone, Key, ArrowLeft } from 'lucide-react';
import logo from '@/assets/logo-pcon-grande.png';
import BlueBackground from '@/components/BlueBackground';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
  email: z.string().email('Email inválido').max(255),
  phone: z.string().optional(),
  pix_key: z.string().optional(),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não conferem",
  path: ["confirmPassword"],
});

const AffiliateRegister = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    pix_key: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAffiliateAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validate form
    const result = registerSchema.safeParse(formData);
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

    setIsLoading(true);
    const registerResult = await register({
      name: formData.name,
      email: formData.email,
      phone: formData.phone || undefined,
      pix_key: formData.pix_key || undefined,
      password: formData.password,
    });
    setIsLoading(false);

    if (registerResult.success) {
      toast.success('Cadastro realizado! Aguarde aprovação para acessar.');
      navigate('/afiliados/login');
    } else {
      toast.error(registerResult.error || 'Erro ao cadastrar');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <BlueBackground />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-card p-8 sm:p-10">
          <motion.div 
            className="flex justify-center mb-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <img 
              src={logo} 
              alt="P-CON Logo" 
              className="h-20 sm:h-24 w-auto" 
            />
          </motion.div>

          <motion.div 
            className="text-center mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <h1 className="text-2xl font-heading font-bold text-foreground mb-2">
              Cadastro de Afiliado
            </h1>
            <p className="text-gray-neutral text-sm">
              Torne-se um parceiro e ganhe indicando
            </p>
          </motion.div>

          <motion.form 
            onSubmit={handleSubmit} 
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground/80 text-sm font-medium">
                Nome Completo *
              </Label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Seu nome completo"
                  value={formData.name}
                  onChange={handleChange}
                  className="pl-12 h-12 bg-secondary/50 border-border/50 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all duration-200 rounded-xl"
                  disabled={isLoading}
                />
              </div>
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground/80 text-sm font-medium">
                Email *
              </Label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-12 h-12 bg-secondary/50 border-border/50 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all duration-200 rounded-xl"
                  disabled={isLoading}
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-foreground/80 text-sm font-medium">
                Telefone (opcional)
              </Label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={formData.phone}
                  onChange={handleChange}
                  className="pl-12 h-12 bg-secondary/50 border-border/50 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all duration-200 rounded-xl"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pix_key" className="text-foreground/80 text-sm font-medium">
                Chave PIX (opcional)
              </Label>
              <div className="relative group">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                <Input
                  id="pix_key"
                  name="pix_key"
                  type="text"
                  placeholder="Sua chave PIX para receber"
                  value={formData.pix_key}
                  onChange={handleChange}
                  className="pl-12 h-12 bg-secondary/50 border-border/50 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all duration-200 rounded-xl"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground/80 text-sm font-medium">
                Senha *
              </Label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-12 h-12 bg-secondary/50 border-border/50 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all duration-200 rounded-xl"
                  disabled={isLoading}
                />
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground/80 text-sm font-medium">
                Confirmar Senha *
              </Label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="pl-12 h-12 bg-secondary/50 border-border/50 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all duration-200 rounded-xl"
                  disabled={isLoading}
                />
              </div>
              {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
            </div>

            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="pt-2"
            >
              <Button 
                type="submit" 
                className="w-full h-12 btn-blue text-base"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Cadastrando...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Criar Conta
                    <ArrowRight className="h-5 w-5" />
                  </span>
                )}
              </Button>
            </motion.div>
          </motion.form>

          <motion.div 
            className="mt-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <Link 
              to="/afiliados/login" 
              className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Já tem conta? Fazer login
            </Link>
          </motion.div>

          <motion.div 
            className="mt-6 p-4 bg-primary/10 rounded-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.4 }}
          >
            <p className="text-xs text-center text-foreground/70">
              ⏳ Após o cadastro, sua conta será analisada pela nossa equipe. 
              Você receberá acesso após a aprovação.
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default AffiliateRegister;
