import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { QrCode, Copy, CheckCircle, Clock, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface PixQRCodeProps {
  qrCode: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
  expirationDate?: string;
  paymentId: string;
  onCheckStatus?: () => Promise<{ status?: string } | null>;
  onPaymentConfirmed?: () => void;
}

const PixQRCode = ({
  qrCode,
  qrCodeBase64,
  ticketUrl,
  expirationDate,
  paymentId,
  onCheckStatus,
  onPaymentConfirmed,
}: PixQRCodeProps) => {
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<'pending' | 'approved' | 'expired'>('pending');
  const [copied, setCopied] = useState(false);

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

  // Auto-check status every 10 seconds
  useEffect(() => {
    if (status !== 'pending' || !onCheckStatus) return;

    const interval = setInterval(async () => {
      const result = await onCheckStatus();
      if (result?.status === 'approved') {
        setStatus('approved');
        toast.success('Pagamento confirmado!');
        onPaymentConfirmed?.();
        clearInterval(interval);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [status, onCheckStatus, onPaymentConfirmed]);

  if (status === 'approved') {
    return (
      <Card className="glass-card border-success/30 bg-success/5">
        <CardContent className="p-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle className="w-8 h-8 text-success" />
          </motion.div>
          <h3 className="text-lg font-semibold text-success mb-2">
            Pagamento Confirmado!
          </h3>
          <p className="text-sm text-muted-foreground">
            Seu pagamento foi processado com sucesso.
          </p>
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
        {/* QR Code Image */}
        <div className="flex justify-center">
          {qrCodeBase64 ? (
            <img
              src={`data:image/png;base64,${qrCodeBase64}`}
              alt="QR Code PIX"
              className="w-48 h-48 rounded-lg"
            />
          ) : (
            <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center">
              <QrCode className="w-16 h-16 text-muted-foreground" />
            </div>
          )}
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
          <Clock className="h-4 w-4 text-warning" />
          <span className="text-muted-foreground">Aguardando pagamento...</span>
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
