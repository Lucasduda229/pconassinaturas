import { CreditCard, Eye, Link2, ShieldCheck } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const settingsCards = [
  {
    icon: Link2,
    title: 'Links públicos ativos',
    description: 'Cada proposta pode gerar um link único para compartilhamento sem login.',
  },
  {
    icon: Eye,
    title: 'Tracking de visualização',
    description: 'O módulo registra primeira visualização, última visita e contador de acessos.',
  },
  {
    icon: ShieldCheck,
    title: 'Aprovação online',
    description: 'A proposta pode ser aprovada ou recusada diretamente pela página pública.',
  },
  {
    icon: CreditCard,
    title: 'Pagamento futuro',
    description: 'Estrutura pronta para integrar PIX, cartão e entrada parcial em uma próxima etapa.',
  },
];

const BudgetSettings = () => {
  return (
    <DashboardLayout
      title="Configurações de Orçamentos"
      subtitle="Base pronta para escalar propostas comerciais e pagamentos futuros"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {settingsCards.map((item) => (
          <Card key={item.title} className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                  <item.icon className="h-5 w-5" />
                </div>
                {item.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default BudgetSettings;