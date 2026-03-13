import { useState } from 'react';
import { Mail, Send, Loader2, Clock, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const EmailSettings = () => {
  const [isTesting, setIsTesting] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const handleTestBillingEmail = async () => {
    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('email-billing-reminder');
      
      if (error) {
        toast.error('Erro ao executar função de email');
        console.error('Error:', error);
        return;
      }

      setLastResult(data);

      if (data?.success) {
        const r = data.results;
        if (r.emails_sent > 0) {
          toast.success(`${r.emails_sent} email(s) de cobrança enviado(s)!`);
        } else {
          toast.info('Nenhum pagamento vencido (D+1) encontrado para enviar email.');
        }
      } else {
        toast.error(data?.error || 'Erro ao processar emails');
      }
    } catch (err) {
      console.error('Error testing billing email:', err);
      toast.error('Erro ao testar envio de email');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
            <Mail className="w-7 h-7 text-primary" />
            Email
          </h1>
          <p className="text-muted-foreground mt-1">
            Configurações e envio de emails de cobrança
          </p>
        </div>

        {/* Domínio configurado */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Domínio de Envio
            </CardTitle>
            <CardDescription>
              Domínio verificado para envio de emails
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-sm px-3 py-1">
                cobranca@assinaturaspcon.sbs
              </Badge>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                Verificado
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              DKIM, SPF e MX configurados via Resend + Vercel DNS.
            </p>
          </CardContent>
        </Card>

        {/* Email de Cobrança D+1 */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Cobrança D+1 (Automática)
            </CardTitle>
            <CardDescription>
              Email enviado automaticamente todo dia às 12h para pagamentos vencidos no dia anterior
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-secondary/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Agendamento</span>
                </div>
                <p className="text-foreground font-semibold">Diário às 12:00</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Remetente</span>
                </div>
                <p className="text-foreground font-semibold text-sm">cobranca@assinaturaspcon.sbs</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Info className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Gatilho</span>
                </div>
                <p className="text-foreground font-semibold">Pagamento vencido D+1</p>
              </div>
            </div>

            <div className="border-t border-border/50 pt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Button
                onClick={handleTestBillingEmail}
                disabled={isTesting}
                className="gap-2"
              >
                {isTesting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {isTesting ? 'Processando...' : 'Executar Agora (Manual)'}
              </Button>
              <p className="text-xs text-muted-foreground">
                Dispara manualmente a verificação e envio de emails para pagamentos vencidos
              </p>
            </div>

            {/* Resultado do último teste */}
            {lastResult?.success && (
              <div className="bg-secondary/20 rounded-lg p-4 mt-2">
                <p className="text-sm font-medium text-foreground mb-2">Resultado:</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-muted-foreground">Enviados:</span>
                    <span className="font-semibold text-foreground">{lastResult.results.emails_sent}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-yellow-500" />
                    <span className="text-muted-foreground">Sem email:</span>
                    <span className="font-semibold text-foreground">{lastResult.results.skipped_no_email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-muted-foreground">Erros:</span>
                    <span className="font-semibold text-foreground">{lastResult.results.errors?.length || 0}</span>
                  </div>
                </div>
                {lastResult.results.errors?.length > 0 && (
                  <div className="mt-2 text-xs text-red-400">
                    {lastResult.results.errors.map((e: string, i: number) => (
                      <p key={i}>• {e}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview do Template */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Preview do Template
            </CardTitle>
            <CardDescription>
              Pré-visualização do email de cobrança enviado aos clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-white rounded-lg overflow-hidden border">
              <div style={{ background: 'linear-gradient(135deg, #0d1b3e 0%, #1E4FA3 100%)' }} className="p-6 text-center">
                <img 
                  src="https://lcnaptefceboratxhzox.supabase.co/storage/v1/object/public/contracts/assets%2Flogo-pcon-white.png" 
                  alt="P-CON" 
                  className="h-10 mx-auto" 
                />
              </div>
              <div className="p-6">
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded mb-4">
                  <p className="text-sm text-yellow-800 font-semibold">
                    ⚠️ Fatura vencida — regularize para manter sua assinatura ativa
                  </p>
                </div>
                <p className="text-gray-800 mb-2">Olá <strong>Nome do Cliente</strong>,</p>
                <p className="text-gray-600 text-sm mb-4">
                  Identificamos que a fatura referente à sua assinatura está <strong className="text-red-600">vencida</strong>.
                </p>
                <div className="bg-gray-50 rounded-lg border p-4 mb-4">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-xs text-gray-500 uppercase">Plano</span>
                    <span className="text-sm font-semibold text-gray-800">Nome do Plano</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-xs text-gray-500 uppercase">Valor</span>
                    <span className="text-sm font-bold text-blue-700">R$ 99,90</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-xs text-gray-500 uppercase">Vencimento</span>
                    <span className="text-sm font-semibold text-red-600">12/03/2026</span>
                  </div>
                </div>
                <div className="text-center">
                  <span className="inline-block bg-blue-700 text-white text-sm font-semibold px-6 py-3 rounded-lg">
                    Acessar Área do Cliente
                  </span>
                </div>
              </div>
              <div style={{ background: '#0d1b3e' }} className="p-4 text-center">
                <p className="text-white text-sm font-semibold">P-CON CONSTRUNET</p>
                <p className="text-gray-400 text-xs">Soluções em Tecnologia e Gestão</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default EmailSettings;
