import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, Copy, CheckCircle, Clock, RefreshCw, ExternalLink, Loader2 } from 'lucide-react';
import QRCode from 'react-qr-code';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import logoPcon from '@/assets/logo-pcon.png';

interface PixQRCodeProps {
  qrCode: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
  expirationDate?: string;
  paymentId: string;
  onCheckStatus?: () => Promise<{ status?: string } | null>;
  onPaymentConfirmed?: () => void;
  isLoading?: boolean;
}

const PixQRCode = ({
  qrCode,
  qrCodeBase64,
  ticketUrl,
  expirationDate,
  paymentId,
  onCheckStatus,
  onPaymentConfirmed,
  isLoading = false,
}: PixQRCodeProps) => {
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<'pending' | 'approved' | 'expired'>('pending');
  const [copied, setCopied] = useState(false);
  const [checkCount, setCheckCount] = useState(0);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(qrCode);
    setCopied(true);
    toast.success('Código PIX copiado!');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleCheckStatus = async () => {
    if (!onCheckStatus) return;
    
    setChecking(true);
    try {
      const result = await onCheckStatus();
      if (result?.status === 'approved') {
        setStatus('approved');
        toast.success('Pagamento confirmado!');
        onPaymentConfirmed?.();
      } else if (result?.status === 'pending') {
        toast.info('Pagamento ainda pendente');
      } else {
        toast.info(`Status: ${result?.status || 'Desconhecido'}`);
      }
    } finally {
      setChecking(false);
    }
  };

  // Auto-check status every 5 seconds for faster feedback
  useEffect(() => {
    if (status !== 'pending' || !onCheckStatus || !paymentId) return;

    const checkStatus = async () => {
      try {
        const result = await onCheckStatus();
        setCheckCount(prev => prev + 1);
        
        if (result?.status === 'approved') {
          setStatus('approved');
          toast.success('🎉 Pagamento confirmado com sucesso!', {
            duration: 5000,
          });
          onPaymentConfirmed?.();
          return true;
        }
      } catch (error) {
        console.error('Error checking status:', error);
      }
      return false;
    };

    // Check immediately on mount
    checkStatus();

    // Then check every 5 seconds
    const interval = setInterval(async () => {
      const confirmed = await checkStatus();
      if (confirmed) {
        clearInterval(interval);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [status, onCheckStatus, onPaymentConfirmed, paymentId]);

  // Loading state while generating QR Code
  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8 text-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="flex justify-center">
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <img src={logoPcon} alt="PCON" className="h-6 w-6 object-contain" />
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Gerando QR Code PIX...
              </h3>
              <p className="text-sm text-muted-foreground">
                Aguarde enquanto preparamos seu pagamento
              </p>
            </div>
          </motion.div>
        </CardContent>
      </Card>
    );
  }

  if (status === 'approved') {
    return (
      <Card className="glass-card border-success/30 bg-success/10 overflow-hidden">
        <CardContent className="p-8 text-center relative">
          {/* Confetti effect */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 pointer-events-none"
          >
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  y: -20, 
                  x: Math.random() * 100 - 50,
                  opacity: 1,
                  scale: 0
                }}
                animate={{ 
                  y: 200,
                  opacity: 0,
                  scale: 1,
                  rotate: Math.random() * 360
                }}
                transition={{ 
                  duration: 2 + Math.random(),
                  delay: Math.random() * 0.5,
                  ease: "easeOut"
                }}
                className="absolute left-1/2 top-0"
                style={{ 
                  width: 8,
                  height: 8,
                  borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                  backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899'][Math.floor(Math.random() * 4)]
                }}
              />
            ))}
          </motion.div>
          
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
            >
              <CheckCircle className="w-10 h-10 text-success" />
            </motion.div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-xl font-bold text-success mb-2">
              🎉 Pagamento Confirmado!
            </h3>
            <p className="text-sm text-muted-foreground">
              Seu pagamento foi processado com sucesso.
            </p>
          </motion.div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          Pague com PIX
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* QR Code Image with Logo */}
        <div className="flex justify-center">
          <div className="relative bg-secondary/50 p-4 rounded-xl border border-primary/30 shadow-lg backdrop-blur-sm">
            {/* Logo PCON no topo */}
            <div className="flex justify-center mb-3">
              <img
                src={logoPcon}
                alt="PCON Construnet"
                className="h-8 object-contain"
              />
            </div>

            {/* QR Code gerado no front (sem fundo branco) */}
            <div className="rounded-lg overflow-hidden">
              <div className="bg-secondary/40 p-3 rounded-lg border border-border/30">
                <div className="relative w-48 h-48">
                  <QRCode
                    value={qrCode}
                    size={192}
                    bgColor="transparent"
                    fgColor="hsl(var(--foreground))"
                    level="M"
                    className="w-full h-full"
                  />

                  {/* Logo pequena no centro do QR Code */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-secondary/90 p-1.5 rounded-md shadow-sm border border-primary/30">
                      <img src={logoPcon} alt="PCON" className="h-6 w-6 object-contain" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Texto Mercado Pago */}
              <p className="text-xs text-muted-foreground text-center mt-2">
                Processado por Mercado Pago
              </p>
            </div>
          </div>
        </div>

        {/* PIX Code (Copia e Cola) */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground text-center">
            Ou copie o código PIX:
          </p>
          <div className="relative">
            <div className="bg-secondary/30 rounded-lg p-3 pr-12 border border-border/30 overflow-hidden">
              <code className="text-xs text-foreground break-all line-clamp-2">
                {qrCode}
              </code>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-1 top-1/2 -translate-y-1/2"
              onClick={handleCopyCode}
            >
              {copied ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Status and Actions */}
        <div className="flex items-center justify-center gap-2 text-sm">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Clock className="h-4 w-4 text-warning" />
          </motion.div>
          <span className="text-muted-foreground">
            Aguardando pagamento...
            {checkCount > 0 && (
              <span className="text-xs ml-1 opacity-50">
                (verificando automaticamente)
              </span>
            )}
          </span>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleCheckStatus}
            disabled={checking}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
            Verificar Status
          </Button>
          {ticketUrl && (
            <Button
              variant="outline"
              onClick={() => window.open(ticketUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>

        {expirationDate && (
          <p className="text-xs text-muted-foreground text-center">
            O QR Code expira em{' '}
            {new Date(expirationDate).toLocaleString('pt-BR')}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default PixQRCode;
