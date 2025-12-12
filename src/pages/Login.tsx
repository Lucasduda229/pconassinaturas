import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, User, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import FuturisticBackground from '@/components/FuturisticBackground';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/logo-pcon.png';

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (isAuthenticated) {
    navigate('/dashboard');
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (!username || !password) {
      toast.error('Por favor, preencha todos os campos.');
      setIsLoading(false);
      return;
    }

    const success = login(username, password);
    
    if (success) {
      toast.success('Login realizado com sucesso!');
      navigate('/dashboard');
    } else {
      toast.error('Usuário ou senha incorretos.');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <FuturisticBackground />
      
      <motion.div 
        className="w-full max-w-sm sm:max-w-md relative z-10"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        {/* Logo with neon glow */}
        <motion.div 
          className="text-center mb-6 sm:mb-8"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <div className="inline-flex items-center justify-center gap-3 mb-3 sm:mb-4 relative">
            <motion.div
              className="absolute inset-0 blur-2xl opacity-60"
              style={{
                background: 'linear-gradient(135deg, hsl(220 70% 55%), hsl(280 75% 45%))',
              }}
              animate={{
                scale: [1, 1.25, 1],
                opacity: [0.35, 0.6, 0.35],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <img src={logo} alt="P-CON" className="h-16 sm:h-24 w-auto relative z-10 neon-glow" />
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
            P-CON <span className="text-gradient">Assinaturas</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Sistema de Gestão de Assinaturas
          </p>
        </motion.div>

        {/* Login Card */}
        <motion.div 
          className="glass-card-premium p-6 sm:p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <h2 className="font-heading text-lg sm:text-xl font-semibold text-foreground mb-5 sm:mb-6">
            Entrar no Sistema
          </h2>
          
          <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80">Usuário</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  type="text"
                  placeholder="Digite seu usuário"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-12 bg-secondary/50 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 h-12 rounded-xl transition-all"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80">Senha</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 pr-12 bg-secondary/50 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 h-12 rounded-xl transition-all"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                type="submit" 
                className="w-full h-12 btn-premium text-base font-semibold"
                disabled={isLoading}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? (
                    'Entrando...'
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Entrar
                    </>
                  )}
                </span>
              </Button>
            </motion.div>
          </form>
        </motion.div>

        <motion.p 
          className="text-center text-muted-foreground/60 text-xs sm:text-sm mt-4 sm:mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          © 2024 P-CON Construct. Todos os direitos reservados.
        </motion.p>
      </motion.div>
    </div>
  );
};

export default Login;