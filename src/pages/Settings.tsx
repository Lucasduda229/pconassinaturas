import { Settings as SettingsIcon, Building, Bell, CreditCard, Shield, Mail } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const Settings = () => {
  const handleSave = () => {
    toast.success('Configurações salvas com sucesso!');
  };

  return (
    <DashboardLayout 
      title="Configurações" 
      subtitle="Gerencie as configurações do sistema"
    >
      <div className="max-w-3xl space-y-6">
        {/* Company Info */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Dados da Empresa
              </h2>
              <p className="text-sm text-muted-foreground">
                Informações que aparecem nas notas fiscais
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Razão Social</label>
              <Input 
                defaultValue="P-CON Construct Ltda"
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">CNPJ</label>
              <Input 
                defaultValue="12.345.678/0001-90"
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">E-mail de Contato</label>
              <Input 
                type="email"
                defaultValue="contato@pcon.com.br"
                className="bg-secondary/50 border-border/50"
              />
            </div>
          </div>
        </div>

        {/* Payment Settings */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-success/10">
              <CreditCard className="w-5 h-5 text-success" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Integração de Pagamento
              </h2>
              <p className="text-sm text-muted-foreground">
                Configurações do Mercado Pago
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Access Token</label>
              <Input 
                type="password"
                placeholder="APP_USR-xxxx"
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Public Key</label>
              <Input 
                placeholder="APP_USR-xxxx"
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Obtenha suas credenciais em{' '}
              <a href="https://mercadopago.com.br/developers" target="_blank" className="text-primary hover:underline">
                mercadopago.com.br/developers
              </a>
            </p>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-warning/10">
              <Bell className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Notificações
              </h2>
              <p className="text-sm text-muted-foreground">
                Configure quando enviar e-mails automáticos
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Cobrança Emitida</p>
                <p className="text-sm text-muted-foreground">Enviar e-mail quando uma cobrança for gerada</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Pagamento Confirmado</p>
                <p className="text-sm text-muted-foreground">Enviar e-mail quando o pagamento for confirmado</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Falha no Pagamento</p>
                <p className="text-sm text-muted-foreground">Enviar e-mail quando houver falha no pagamento</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Lembrete de Vencimento</p>
                <p className="text-sm text-muted-foreground">Enviar lembrete 3 dias antes do vencimento</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </div>

        {/* Email Settings */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Configuração de E-mail
              </h2>
              <p className="text-sm text-muted-foreground">
                SMTP para envio de notificações
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Servidor SMTP</label>
              <Input 
                placeholder="smtp.exemplo.com"
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Porta</label>
              <Input 
                placeholder="587"
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Usuário</label>
              <Input 
                placeholder="email@exemplo.com"
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Senha</label>
              <Input 
                type="password"
                placeholder="••••••••"
                className="bg-secondary/50 border-border/50"
              />
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-destructive/10">
              <Shield className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Segurança
              </h2>
              <p className="text-sm text-muted-foreground">
                Configurações de segurança do sistema
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Autenticação em Duas Etapas</p>
                <p className="text-sm text-muted-foreground">Requer código adicional no login</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Logs de Atividade</p>
                <p className="text-sm text-muted-foreground">Registrar todas as ações do sistema</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} className="px-8">
            Salvar Configurações
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
