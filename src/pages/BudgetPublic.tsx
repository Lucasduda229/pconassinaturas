import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Clock3, CreditCard, Eye, FileText, ShieldCheck, XCircle } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import BlueBackground from '@/components/BlueBackground';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Proposal, ProposalStatus } from '@/hooks/useProposals';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/logo-pcon-grande.png';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

const formatDate = (value: string) => format(new Date(value), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

const statusMap: Record<ProposalStatus, { label: string; className: string }> = {
  draft: { label: 'Rascunho', className: 'bg-muted text-muted-foreground border-border' },
  sent: { label: 'Enviado', className: 'bg-primary/15 text-primary border-primary/30' },
  viewed: { label: 'Visualizado', className: 'bg-accent/20 text-accent-foreground border-accent/40' },
  approved: { label: 'Aprovado', className: 'bg-success/20 text-success border-success/30' },
  rejected: { label: 'Recusado', className: 'bg-destructive/20 text-destructive border-destructive/30' },
  entry_paid: { label: 'Entrada paga', className: 'bg-warning/20 text-warning border-warning/30' },
  paid: { label: 'Pago', className: 'bg-success/30 text-success border-success/40' },
  expired: { label: 'Vencido', className: 'bg-warning/15 text-warning border-warning/40' },
};

const normalizeStatus = (proposal: Proposal): Proposal => {
  const expired = ['approved', 'rejected', 'entry_paid', 'paid', 'expired'].includes(proposal.status)
    ? proposal.status === 'expired'
    : new Date(proposal.valid_until).getTime() < Date.now();

  return {
    ...proposal,
    status: expired ? 'expired' : proposal.status,
  };
};

const BudgetPublic = () => {
  const { slug } = useParams();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const hasTrackedView = useRef(false);

  const notifyEvent = async (proposalId: string, eventType: 'viewed' | 'approved' | 'rejected') => {
    try {
      await supabase.functions.invoke('proposal-status-notification', {
        body: { proposalId, eventType },
      });
    } catch (error) {
      console.error(`Error notifying proposal event ${eventType}:`, error);
    }
  };

  useEffect(() => {
    if (!slug || hasTrackedView.current) return;
    hasTrackedView.current = true;

    const loadProposal = async () => {
      try {
        const { data, error } = await (supabase as any).rpc('record_proposal_view', {
          p_public_slug: slug,
        });

        if (error) throw error;
        if (!data) throw new Error('Proposal not found');

        const normalized = normalizeStatus(data as Proposal);
        setProposal(normalized);
        void notifyEvent(normalized.id, 'viewed');
      } catch (error) {
        console.error('Error loading public proposal:', error);
        setProposal(null);
      } finally {
        setLoading(false);
      }
    };

    void loadProposal();
  }, [slug]);

  const canRespond = useMemo(() => {
    if (!proposal) return false;
    return proposal.allow_online_approval && !['approved', 'rejected', 'paid', 'entry_paid', 'expired'].includes(proposal.status);
  }, [proposal]);

  const handleResponse = async (action: 'approve' | 'reject') => {
    if (!slug || !proposal) return;

    setSubmitting(true);
    try {
      const { data, error } = await (supabase as any).rpc('respond_to_proposal', {
        p_public_slug: slug,
        p_action: action,
      });

      if (error) throw error;
      if (!data) throw new Error('No proposal returned');

      const normalized = normalizeStatus(data as Proposal);
      setProposal(normalized);
      void notifyEvent(normalized.id, action === 'approve' ? 'approved' : 'rejected');
      toast.success(action === 'approve' ? 'Proposta aprovada com sucesso' : 'Proposta recusada');
    } catch (error) {
      console.error('Error responding to proposal:', error);
      toast.error('Não foi possível registrar sua resposta');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentPlaceholder = (type: 'entry' | 'total') => {
    toast.info(type === 'entry' ? 'Pagamento da entrada será habilitado em breve.' : 'Pagamento total será habilitado em breve.');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <BlueBackground />
        <div className="relative z-10 text-muted-foreground">Carregando proposta...</div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen flex items-center justify-center relative px-4">
        <BlueBackground />
        <Card className="glass-card relative z-10 max-w-lg w-full">
          <CardContent className="p-8 text-center space-y-4">
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <div>
              <h1 className="text-2xl font-heading font-bold">Proposta não encontrada</h1>
              <p className="text-muted-foreground mt-2">O link pode ter expirado ou não está mais disponível.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <BlueBackground />
      <div className="relative z-10">
        <header className="border-b border-border/30 bg-background/50 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-5 flex items-center justify-between gap-4">
            <img src={logo} alt="P-CON" className="h-12 w-auto" />
            <Badge className={`border ${statusMap[proposal.status].className}`}>{statusMap[proposal.status].label}</Badge>
          </div>
        </header>

        <main className="container mx-auto px-4 py-10 sm:py-16">
          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr] items-start">
            <div className="space-y-6">
              <div className="space-y-4 max-w-3xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm text-primary">
                  <ShieldCheck className="h-4 w-4" />
                  Proposta comercial digital
                </span>
                <h1 className="text-4xl sm:text-5xl font-heading font-bold leading-tight">{proposal.project_title}</h1>
                <p className="text-lg text-muted-foreground leading-relaxed">{proposal.project_description || 'Proposta comercial estruturada para apresentação profissional do projeto.'}</p>
              </div>

              <Card className="glass-card">
                <CardContent className="p-6 grid gap-6 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <p className="text-lg font-semibold">{proposal.client_name}</p>
                    {proposal.client_company && <p className="text-sm text-muted-foreground mt-1">{proposal.client_company}</p>}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Validade</p>
                    <p className="text-lg font-semibold">{formatDate(proposal.valid_until)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Prazo</p>
                    <p className="text-lg font-semibold">{proposal.delivery_deadline || 'A combinar'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Prazo para início</p>
                    <p className="text-lg font-semibold">{proposal.start_deadline || 'Imediato após aprovação'}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-heading font-semibold">Escopo do projeto</h2>
                  </div>
                  <div className="grid gap-3">
                    {proposal.scope_items?.map((item, index) => (
                      <div key={`${item}-${index}`} className="rounded-2xl border border-border/60 bg-secondary/20 px-4 py-3">
                        {item}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {(proposal.notes || proposal.terms_and_conditions) && (
                <Card className="glass-card">
                  <CardContent className="p-6 space-y-5">
                    {proposal.notes && (
                      <div>
                        <h3 className="font-semibold mb-2">Observações</h3>
                        <p className="text-muted-foreground whitespace-pre-line">{proposal.notes}</p>
                      </div>
                    )}
                    {proposal.terms_and_conditions && (
                      <div>
                        <h3 className="font-semibold mb-2">Termos e condições</h3>
                        <p className="text-muted-foreground whitespace-pre-line">{proposal.terms_and_conditions}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="xl:sticky xl:top-8 space-y-6">
              <Card className="glass-card overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-primary/15 border-b border-border/40 p-6">
                    <p className="text-sm uppercase tracking-[0.2em] text-primary">Investimento</p>
                    <div className="mt-3 text-4xl font-heading font-bold">{formatCurrency(proposal.total_amount)}</div>
                    {proposal.discount_amount > 0 && (
                      <p className="text-sm text-muted-foreground mt-2">Desconto aplicado: {formatCurrency(proposal.discount_amount)}</p>
                    )}
                  </div>
                  <div className="p-6 space-y-4">
                    {proposal.entry_amount && (
                      <div className="flex items-center justify-between rounded-xl border border-border/60 bg-secondary/20 px-4 py-3">
                        <span>Valor de entrada</span>
                        <span className="font-semibold">{formatCurrency(proposal.entry_amount)}</span>
                      </div>
                    )}
                    {proposal.monthly_amount && (
                      <div className="flex items-center justify-between rounded-xl border border-border/60 bg-secondary/20 px-4 py-3">
                        <span>Mensalidade</span>
                        <span className="font-semibold">{formatCurrency(proposal.monthly_amount)}</span>
                      </div>
                    )}
                    {proposal.monthly_amount && (
                      <p className="text-xs text-muted-foreground rounded-xl border border-border/60 bg-secondary/10 px-4 py-3">
                        A mensalidade é apenas informativa nesta etapa e a cobrança será gerada no mês seguinte.
                      </p>
                    )}
                    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-2"><Eye className="h-4 w-4" /> Visualizações</span>
                      <span className="font-medium text-foreground">{proposal.view_count}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-2"><Clock3 className="h-4 w-4" /> Última visita</span>
                      <span className="font-medium text-foreground">{proposal.last_viewed_at ? formatDate(proposal.last_viewed_at) : 'Agora'}</span>
                    </div>

                    <div className="grid gap-3 pt-2">
                      <Button onClick={() => handleResponse('approve')} disabled={!canRespond || submitting} className="w-full">
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Aprovar proposta
                      </Button>
                      <Button variant="outline" onClick={() => handleResponse('reject')} disabled={!canRespond || submitting} className="w-full">
                        <XCircle className="h-4 w-4 mr-2" />
                        Recusar proposta
                      </Button>
                      <Button variant="secondary" onClick={() => handlePaymentPlaceholder('entry')} disabled={!proposal.allow_payment || !proposal.entry_amount} className="w-full">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pagar entrada
                      </Button>
                      <Button variant="secondary" onClick={() => handlePaymentPlaceholder('total')} disabled={!proposal.allow_payment} className="w-full">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pagar total
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default BudgetPublic;