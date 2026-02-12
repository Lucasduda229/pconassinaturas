import { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt,
  CreditCard,
  Users,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ComposedChart,
} from 'recharts';
import {
  format, subMonths, startOfMonth, endOfMonth, isWithinInterval,
  startOfYear, endOfYear, eachMonthOfInterval, subYears, isSameMonth,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DashboardLayout from '@/components/DashboardLayout';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

const CHART_COLORS = {
  primary: 'hsl(216, 68%, 45%)',
  primaryLight: 'hsl(216, 68%, 55%)',
  success: '#22c55e',
  successLight: '#4ade80',
  warning: '#eab308',
  warningLight: '#facc15',
  danger: '#ef4444',
  dangerLight: '#f87171',
  muted: '#6b7280',
  purple: '#a855f7',
  cyan: '#06b6d4',
};

const GRADIENT_ID = {
  revenue: 'revenueGradient',
  expense: 'expenseGradient',
  profit: 'profitGradient',
};

const Financial = () => {
  const { clients, subscriptions, payments, invoices, loadingPayments } = useGlobalData();
  const [period, setPeriod] = useState('12');
  const [tab, setTab] = useState('overview');

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatCurrencyShort = (value: number) => {
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
    return `R$ ${value.toFixed(0)}`;
  };

  // ─── Monthly breakdown data ────────────────────────
  const monthlyData = useMemo(() => {
    const months = parseInt(period);
    const result = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const mStart = startOfMonth(date);
      const mEnd = endOfMonth(date);

      const paid = payments.filter(p => {
        if (p.status !== 'paid') return false;
        const d = new Date(p.paid_at || p.created_at);
        return isWithinInterval(d, { start: mStart, end: mEnd });
      });
      const pending = payments.filter(p => {
        if (p.status !== 'pending') return false;
        const d = new Date(p.created_at);
        return isWithinInterval(d, { start: mStart, end: mEnd });
      });
      const failed = payments.filter(p => {
        if (p.status !== 'failed' && p.status !== 'overdue') return false;
        const d = new Date(p.created_at);
        return isWithinInterval(d, { start: mStart, end: mEnd });
      });

      const revenue = paid.reduce((s, p) => s + Number(p.amount), 0);
      const pendingVal = pending.reduce((s, p) => s + Number(p.amount), 0);
      const lostVal = failed.reduce((s, p) => s + Number(p.amount), 0);

      result.push({
        month: format(date, 'MMM', { locale: ptBR }),
        fullMonth: format(date, 'MMMM yyyy', { locale: ptBR }),
        receita: revenue,
        pendente: pendingVal,
        prejuizo: lostVal,
        lucro: revenue, // no expenses tracked, revenue = profit
        paidCount: paid.length,
        pendingCount: pending.length,
        failedCount: failed.length,
      });
    }
    return result;
  }, [payments, period]);

  // ─── Summary KPIs ─────────────────────────────────
  const kpis = useMemo(() => {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const revenueThisMonth = payments
      .filter(p => p.status === 'paid' && isWithinInterval(new Date(p.paid_at || p.created_at), { start: thisMonthStart, end: thisMonthEnd }))
      .reduce((s, p) => s + Number(p.amount), 0);

    const revenueLastMonth = payments
      .filter(p => p.status === 'paid' && isWithinInterval(new Date(p.paid_at || p.created_at), { start: lastMonthStart, end: lastMonthEnd }))
      .reduce((s, p) => s + Number(p.amount), 0);

    const totalRevenue = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0);
    const totalPending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0);
    const totalLost = payments.filter(p => p.status === 'failed' || p.status === 'overdue').reduce((s, p) => s + Number(p.amount), 0);

    const revenueGrowth = revenueLastMonth > 0
      ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
      : revenueThisMonth > 0 ? 100 : 0;

    const activeSubsValue = subscriptions.filter(s => s.status === 'active').reduce((s, sub) => s + Number(sub.value), 0);
    const avgTicket = payments.filter(p => p.status === 'paid').length > 0
      ? totalRevenue / payments.filter(p => p.status === 'paid').length : 0;

    return {
      revenueThisMonth,
      revenueLastMonth,
      revenueGrowth,
      totalRevenue,
      totalPending,
      totalLost,
      activeSubsValue,
      avgTicket,
      invoicesCount: invoices.length,
    };
  }, [payments, subscriptions, invoices]);

  // ─── Plan distribution ─────────────────────────────
  const planData = useMemo(() => {
    const planMap: Record<string, { count: number; value: number }> = {};
    subscriptions.filter(s => s.status === 'active').forEach(s => {
      if (!planMap[s.plan_name]) planMap[s.plan_name] = { count: 0, value: 0 };
      planMap[s.plan_name].count++;
      planMap[s.plan_name].value += Number(s.value);
    });
    const colors = [CHART_COLORS.primary, CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.purple, CHART_COLORS.cyan, CHART_COLORS.danger];
    return Object.entries(planMap).map(([name, d], i) => ({
      name,
      count: d.count,
      value: d.value,
      color: colors[i % colors.length],
    }));
  }, [subscriptions]);

  // ─── Payment method distribution ────────────────────
  const methodData = useMemo(() => {
    const methodMap: Record<string, { count: number; value: number }> = {};
    payments.filter(p => p.status === 'paid').forEach(p => {
      const method = p.payment_method || 'Outros';
      if (!methodMap[method]) methodMap[method] = { count: 0, value: 0 };
      methodMap[method].count++;
      methodMap[method].value += Number(p.amount);
    });
    const colors = [CHART_COLORS.primary, CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.purple];
    return Object.entries(methodMap).map(([name, d], i) => ({
      name,
      count: d.count,
      value: d.value,
      color: colors[i % colors.length],
    }));
  }, [payments]);

  // ─── Custom tooltip ────────────────────────────────
  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="glass-card p-3 border border-border/50 shadow-xl text-sm">
        <p className="font-medium text-foreground capitalize mb-1">{payload[0]?.payload?.fullMonth || label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="flex items-center gap-2" style={{ color: p.color }}>
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            {p.name}: <span className="font-semibold">{formatCurrency(p.value)}</span>
          </p>
        ))}
      </div>
    );
  };

  const PieTooltipContent = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="glass-card p-3 border border-border/50 shadow-xl text-sm">
        <p className="font-medium text-foreground">{payload[0].name}</p>
        <p className="text-muted-foreground">{payload[0].payload.count} assinaturas</p>
        <p className="font-semibold" style={{ color: payload[0].payload.color }}>
          {formatCurrency(payload[0].payload.value)}
        </p>
      </div>
    );
  };

  // ─── KPI Card Component ────────────────────────────
  const KPICard = ({ title, value, icon: Icon, trend, trendValue, color = 'primary' }: {
    title: string; value: string; icon: any; trend?: 'up' | 'down' | 'neutral'; trendValue?: string; color?: string;
  }) => (
    <div className="glass-card glass-card-hover p-5 group">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${
          color === 'success' ? 'bg-success/15' :
          color === 'warning' ? 'bg-warning/15' :
          color === 'danger' ? 'bg-destructive/15' :
          'bg-primary/15'
        }`}>
          <Icon className={`w-5 h-5 ${
            color === 'success' ? 'text-success' :
            color === 'warning' ? 'text-warning' :
            color === 'danger' ? 'text-destructive' :
            'text-primary'
          }`} />
        </div>
        {trend && trendValue && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
            trend === 'up' ? 'bg-success/15 text-success' :
            trend === 'down' ? 'bg-destructive/15 text-destructive' :
            'bg-muted text-muted-foreground'
          }`}>
            {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : trend === 'down' ? <ArrowDownRight className="w-3 h-3" /> : null}
            {trendValue}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold font-heading text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{title}</p>
    </div>
  );

  return (
    <DashboardLayout title="Financeiro" subtitle="Relatórios e análises financeiras detalhadas">
      {/* Period Filter */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="w-4 h-4" />
          <span>Período:</span>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px] glass-card border-border/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Últimos 3 meses</SelectItem>
            <SelectItem value="6">Últimos 6 meses</SelectItem>
            <SelectItem value="12">Últimos 12 meses</SelectItem>
            <SelectItem value="24">Últimos 24 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <KPICard
          title="Receita do Mês"
          value={formatCurrency(kpis.revenueThisMonth)}
          icon={DollarSign}
          trend={kpis.revenueGrowth >= 0 ? 'up' : 'down'}
          trendValue={`${Math.abs(kpis.revenueGrowth).toFixed(1)}%`}
          color="success"
        />
        <KPICard
          title="Receita Recorrente (MRR)"
          value={formatCurrency(kpis.activeSubsValue)}
          icon={TrendingUp}
          color="primary"
        />
        <KPICard
          title="Pendente Total"
          value={formatCurrency(kpis.totalPending)}
          icon={Wallet}
          color="warning"
        />
        <KPICard
          title="Prejuízo (Falhas)"
          value={formatCurrency(kpis.totalLost)}
          icon={TrendingDown}
          color="danger"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <KPICard
          title="Receita Total Acumulada"
          value={formatCurrency(kpis.totalRevenue)}
          icon={BarChart3}
        />
        <KPICard
          title="Ticket Médio"
          value={formatCurrency(kpis.avgTicket)}
          icon={CreditCard}
        />
        <KPICard
          title="Notas Fiscais Emitidas"
          value={String(kpis.invoicesCount)}
          icon={Receipt}
        />
        <KPICard
          title="Clientes Ativos"
          value={String(clients.filter(c => c.status === 'active').length)}
          icon={Users}
          color="success"
        />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="glass-card border border-border/50 p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="revenue" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            Receitas
          </TabsTrigger>
          <TabsTrigger value="plans" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            Planos
          </TabsTrigger>
          <TabsTrigger value="methods" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            Métodos
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Revenue vs Losses area chart */}
          <div className="glass-card p-4 sm:p-6">
            <h3 className="font-heading text-lg font-semibold text-foreground mb-1">Receita vs Prejuízo</h3>
            <p className="text-sm text-muted-foreground mb-4">Evolução mensal de receita recebida e valores perdidos</p>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id={GRADIENT_ID.revenue} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id={GRADIENT_ID.expense} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.danger} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.danger} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={formatCurrencyShort} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickLine={false} axisLine={false} width={70} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="receita" name="Receita" stroke={CHART_COLORS.success} fill={`url(#${GRADIENT_ID.revenue})`} strokeWidth={2.5} dot={{ r: 4, fill: CHART_COLORS.success }} activeDot={{ r: 6 }} />
                  <Area type="monotone" dataKey="prejuizo" name="Prejuízo" stroke={CHART_COLORS.danger} fill={`url(#${GRADIENT_ID.expense})`} strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS.danger }} />
                  <Line type="monotone" dataKey="pendente" name="Pendente" stroke={CHART_COLORS.warning} strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3, fill: CHART_COLORS.warning }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly comparison bars */}
          <div className="glass-card p-4 sm:p-6">
            <h3 className="font-heading text-lg font-semibold text-foreground mb-1">Comparativo Mensal</h3>
            <p className="text-sm text-muted-foreground mb-4">Receita, pendências e prejuízos por mês</p>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={formatCurrencyShort} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickLine={false} axisLine={false} width={70} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="receita" name="Receita" fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="pendente" name="Pendente" fill={CHART_COLORS.warning} radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="prejuizo" name="Prejuízo" fill={CHART_COLORS.danger} radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="glass-card p-4 sm:p-6">
            <h3 className="font-heading text-lg font-semibold text-foreground mb-1">Curva de Receita</h3>
            <p className="text-sm text-muted-foreground mb-4">Evolução detalhada da receita ao longo do tempo</p>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={formatCurrencyShort} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickLine={false} axisLine={false} width={70} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="receita" name="Receita" stroke={CHART_COLORS.primary} fill="url(#revAreaGrad)" strokeWidth={3} dot={{ r: 5, fill: CHART_COLORS.primary, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Volume */}
          <div className="glass-card p-4 sm:p-6">
            <h3 className="font-heading text-lg font-semibold text-foreground mb-1">Volume de Transações</h3>
            <p className="text-sm text-muted-foreground mb-4">Quantidade de pagamentos por status mensal</p>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="paidCount" name="Pagos" fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} maxBarSize={30} stackId="a" />
                  <Bar dataKey="pendingCount" name="Pendentes" fill={CHART_COLORS.warning} radius={[0, 0, 0, 0]} maxBarSize={30} stackId="a" />
                  <Bar dataKey="failedCount" name="Falhos" fill={CHART_COLORS.danger} radius={[4, 4, 0, 0]} maxBarSize={30} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-4 sm:p-6">
              <h3 className="font-heading text-lg font-semibold text-foreground mb-1">Distribuição por Plano</h3>
              <p className="text-sm text-muted-foreground mb-4">Receita recorrente por plano ativo</p>
              <div className="h-[300px]">
                {planData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={planData} cx="50%" cy="45%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                        {planData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltipContent />} />
                      <Legend verticalAlign="bottom" height={36} formatter={(v: string) => <span className="text-xs text-muted-foreground">{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Sem planos ativos</div>
                )}
              </div>
            </div>

            <div className="glass-card p-4 sm:p-6">
              <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Detalhamento por Plano</h3>
              <div className="space-y-4">
                {planData.length > 0 ? planData.map((plan, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/30">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ background: plan.color }} />
                      <div>
                        <p className="font-medium text-foreground text-sm">{plan.name}</p>
                        <p className="text-xs text-muted-foreground">{plan.count} assinatura{plan.count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <p className="font-semibold text-foreground">{formatCurrency(plan.value)}<span className="text-xs text-muted-foreground">/mês</span></p>
                  </div>
                )) : (
                  <p className="text-muted-foreground text-sm text-center py-8">Sem dados</p>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Methods Tab */}
        <TabsContent value="methods" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-4 sm:p-6">
              <h3 className="font-heading text-lg font-semibold text-foreground mb-1">Métodos de Pagamento</h3>
              <p className="text-sm text-muted-foreground mb-4">Distribuição de pagamentos recebidos por método</p>
              <div className="h-[300px]">
                {methodData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={methodData} cx="50%" cy="45%" innerRadius={55} outerRadius={95} paddingAngle={3} dataKey="value">
                        {methodData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltipContent />} />
                      <Legend verticalAlign="bottom" height={36} formatter={(v: string) => <span className="text-xs text-muted-foreground">{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
                )}
              </div>
            </div>

            <div className="glass-card p-4 sm:p-6">
              <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Detalhamento por Método</h3>
              <div className="space-y-4">
                {methodData.length > 0 ? methodData.map((m, i) => {
                  const total = methodData.reduce((s, x) => s + x.value, 0);
                  const pct = total > 0 ? ((m.value / total) * 100).toFixed(1) : '0';
                  return (
                    <div key={i} className="p-3 rounded-xl bg-secondary/30 border border-border/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ background: m.color }} />
                          <span className="font-medium text-foreground text-sm">{m.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{pct}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-secondary/50 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: m.color }} />
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                        <span>{m.count} pagamento{m.count !== 1 ? 's' : ''}</span>
                        <span className="font-semibold text-foreground">{formatCurrency(m.value)}</span>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-muted-foreground text-sm text-center py-8">Sem dados</p>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default Financial;
