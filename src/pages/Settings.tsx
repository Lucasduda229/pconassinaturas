import { Settings as SettingsIcon, Building, Bell, CreditCard, Shield, Mail, ChevronRight } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type SettingsSection = 'company' | 'payment' | 'notifications' | 'email' | 'security';

const Settings = () => {
  const [activeSection, setActiveSection] = useState<SettingsSection | null>(null);

  const handleSave = () => {
    toast.success('Configurações salvas com sucesso!');
  };

  const sections = [
    { id: 'company' as const, icon: Building, label: 'Dados da Empresa', desc: 'Informações nas notas fiscais', color: 'bg-primary/10 text-primary' },
    { id: 'payment' as const, icon: CreditCard, label: 'Integração de Pagamento', desc: 'Configurações do Mercado Pago', color: 'bg-success/10 text-success' },
    { id: 'notifications' as const, icon: Bell, label: 'Notificações', desc: 'E-mails automáticos', color: 'bg-warning/10 text-warning' },
    { id: 'email' as const, icon: Mail, label: 'Configuração de E-mail', desc: 'SMTP para envio', color: 'bg-primary/10 text-primary' },
    { id: 'security' as const, icon: Shield, label: 'Segurança', desc: 'Proteção do sistema', color: 'bg-destructive/10 text-destructive' },
  ];

  // Mobile: show section list or section content
  const renderMobileView = () => {
    if (!activeSection) {
      return (
        <div className="space-y-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className="w-full glass-card p-4 flex items-center gap-4 hover:bg-secondary/30 transition-colors"
            >
              <div className={cn('p-2 rounded-lg', section.color)}>
                <section.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-foreground">{section.label}</p>
                <p className="text-xs text-muted-foreground">{section.desc}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <button 
          onClick={() => setActiveSection(null)}
          className="text-primary text-sm font-medium"
        >
          ← Voltar
        </button>
        {renderSectionContent(activeSection)}
      </div>
    );
  };

  const renderSectionContent = (section: SettingsSection) => {
    switch (section) {
      case 'company':
        return (
          <div className="glass-card p-4 sm:p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Razão Social</label>
              <Input defaultValue="P-CON Construct Ltda" className="bg-secondary/50 border-border/50" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">CNPJ</label>
              <Input defaultValue="12.345.678/0001-90" className="bg-secondary/50 border-border/50" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">E-mail de Contato</label>
              <Input type="email" defaultValue="contato@pcon.com.br" className="bg-secondary/50 border-border/50" />
            </div>
          </div>
        );
      case 'payment':
        return (
          <div className="glass-card p-4 sm:p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Access Token</label>
              <Input type="password" placeholder="APP_USR-xxxx" className="bg-secondary/50 border-border/50" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Public Key</label>
              <Input placeholder="APP_USR-xxxx" className="bg-secondary/50 border-border/50" />
            </div>
            <p className="text-xs text-muted-foreground">
              Obtenha suas credenciais em{' '}
              <a href="https://mercadopago.com.br/developers" target="_blank" className="text-primary hover:underline">
                mercadopago.com.br/developers
              </a>
            </p>
          </div>
        );
      case 'notifications':
        return (
          <div className="glass-card p-4 sm:p-6 space-y-4">
            {[
              { label: 'Cobrança Emitida', desc: 'Enviar e-mail quando uma cobrança for gerada' },
              { label: 'Pagamento Confirmado', desc: 'Enviar e-mail quando o pagamento for confirmado' },
              { label: 'Falha no Pagamento', desc: 'Enviar e-mail quando houver falha no pagamento' },
              { label: 'Lembrete de Vencimento', desc: 'Enviar lembrete 3 dias antes do vencimento' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch defaultChecked />
              </div>
            ))}
          </div>
        );
      case 'email':
        return (
          <div className="glass-card p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Servidor SMTP</label>
                <Input placeholder="smtp.exemplo.com" className="bg-secondary/50 border-border/50" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Porta</label>
                <Input placeholder="587" className="bg-secondary/50 border-border/50" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Usuário</label>
                <Input placeholder="email@exemplo.com" className="bg-secondary/50 border-border/50" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Senha</label>
                <Input type="password" placeholder="••••••••" className="bg-secondary/50 border-border/50" />
              </div>
            </div>
          </div>
        );
      case 'security':
        return (
          <div className="glass-card p-4 sm:p-6 space-y-4">
            {[
              { label: 'Autenticação em Duas Etapas', desc: 'Requer código adicional no login', defaultChecked: false },
              { label: 'Logs de Atividade', desc: 'Registrar todas as ações do sistema', defaultChecked: true },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch defaultChecked={item.defaultChecked} />
              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <DashboardLayout 
      title="Configurações" 
      subtitle="Gerencie as configurações do sistema"
    >
      {/* Mobile View */}
      <div className="lg:hidden">
        {renderMobileView()}
        {activeSection && (
          <div className="mt-4">
            <Button onClick={handleSave} className="w-full">
              Salvar Configurações
            </Button>
          </div>
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block max-w-3xl space-y-6">
        {sections.map((section) => (
          <div key={section.id} className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className={cn('p-2 rounded-lg', section.color)}>
                <section.icon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">{section.label}</h2>
                <p className="text-sm text-muted-foreground">{section.desc}</p>
              </div>
            </div>
            {section.id === 'company' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Razão Social</label>
                  <Input defaultValue="P-CON Construct Ltda" className="bg-secondary/50 border-border/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">CNPJ</label>
                  <Input defaultValue="12.345.678/0001-90" className="bg-secondary/50 border-border/50" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">E-mail de Contato</label>
                  <Input type="email" defaultValue="contato@pcon.com.br" className="bg-secondary/50 border-border/50" />
                </div>
              </div>
            )}
            {section.id === 'payment' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Access Token</label>
                  <Input type="password" placeholder="APP_USR-xxxx" className="bg-secondary/50 border-border/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Public Key</label>
                  <Input placeholder="APP_USR-xxxx" className="bg-secondary/50 border-border/50" />
                </div>
              </div>
            )}
            {section.id === 'notifications' && (
              <div className="space-y-4">
                {[
                  { label: 'Cobrança Emitida', desc: 'Enviar e-mail quando uma cobrança for gerada' },
                  { label: 'Pagamento Confirmado', desc: 'Enviar e-mail quando o pagamento for confirmado' },
                  { label: 'Falha no Pagamento', desc: 'Enviar e-mail quando houver falha no pagamento' },
                  { label: 'Lembrete de Vencimento', desc: 'Enviar lembrete 3 dias antes do vencimento' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                ))}
              </div>
            )}
            {section.id === 'email' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Servidor SMTP</label>
                  <Input placeholder="smtp.exemplo.com" className="bg-secondary/50 border-border/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Porta</label>
                  <Input placeholder="587" className="bg-secondary/50 border-border/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Usuário</label>
                  <Input placeholder="email@exemplo.com" className="bg-secondary/50 border-border/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Senha</label>
                  <Input type="password" placeholder="••••••••" className="bg-secondary/50 border-border/50" />
                </div>
              </div>
            )}
            {section.id === 'security' && (
              <div className="space-y-4">
                {[
                  { label: 'Autenticação em Duas Etapas', desc: 'Requer código adicional no login', defaultChecked: false },
                  { label: 'Logs de Atividade', desc: 'Registrar todas as ações do sistema', defaultChecked: true },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch defaultChecked={item.defaultChecked} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
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
