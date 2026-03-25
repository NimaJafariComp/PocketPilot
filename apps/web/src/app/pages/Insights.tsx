import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Sparkles, TrendingUp, TrendingDown, Repeat, Send, Info, ArrowUpRight, ArrowDownRight, Activity, Package } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { startOfMonth, endOfMonth, subMonths, parseISO, format } from 'date-fns';
import { services } from '../lib/services';

const CHART_COLORS = [
  'oklch(0.646 0.222 41.116)',
  'oklch(0.6 0.118 184.704)',
  'oklch(0.398 0.07 227.392)',
  'oklch(0.828 0.189 84.429)',
  'oklch(0.769 0.188 70.08)',
  '#d1d5db',
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// ── Donut legend row ──────────────────────────────────────────────
function LegendRow({ name, pct, color }: { name: string; pct: number; color: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="text-sm truncate">{name}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-12 h-0.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
        </div>
        <span className="text-xs font-mono text-muted-foreground w-8 text-right">{pct}%</span>
      </div>
    </div>
  );
}

// ── Horizontal bar row ────────────────────────────────────────────
function HBar({ name, value, max, color }: { name: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{name}</span>
        <span className="text-xs font-mono text-muted-foreground">${value.toLocaleString()}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ── Initials avatar ───────────────────────────────────────────────
function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 text-xs font-semibold text-muted-foreground">
      {initials}
    </div>
  );
}

export function Insights() {
  const { transactions } = useData();
  const { user: currentUser } = useAuth();
  const [tab, setTab] = useState<'summary' | 'assistant'>('summary');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [assistantError, setAssistantError] = useState('');

  // ── Computed insights ─────────────────────────────────────────────
  const insights = useMemo(() => {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd   = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd   = endOfMonth(subMonths(now, 1));

    const thisMonthTx = transactions.filter(t => { const d = parseISO(t.date); return d >= thisMonthStart && d <= thisMonthEnd && t.amount < 0; });
    const lastMonthTx = transactions.filter(t => { const d = parseISO(t.date); return d >= lastMonthStart && d <= lastMonthEnd && t.amount < 0; });

    const thisMonthSpent = Math.abs(thisMonthTx.reduce((s, t) => s + t.amount, 0));
    const lastMonthSpent = Math.abs(lastMonthTx.reduce((s, t) => s + t.amount, 0));
    const changePercent  = lastMonthSpent > 0 ? ((thisMonthSpent - lastMonthSpent) / lastMonthSpent) * 100 : 0;
    const thisMonthCount = transactions.filter(t => { const d = parseISO(t.date); return d >= thisMonthStart && d <= thisMonthEnd; }).length;

    const categorySpending = thisMonthTx.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount); return acc;
    }, {} as Record<string, number>);

    const categoryData = Object.entries(categorySpending)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const totalCategorySpend = categoryData.reduce((s, c) => s + c.value, 0);

    const lastMonthCats = lastMonthTx.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount); return acc;
    }, {} as Record<string, number>);

    const changes = Object.keys({ ...categorySpending, ...lastMonthCats }).map(category => {
      const thisMonth = categorySpending[category] || 0;
      const lastMonth = lastMonthCats[category] || 0;
      const change = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : (thisMonth > 0 ? 100 : 0);
      return { category, change, thisMonth, lastMonth, delta: thisMonth - lastMonth };
    }).sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 3);

    const merchantFrequency = transactions.reduce((acc, t) => {
      acc[t.merchant] = (acc[t.merchant] || 0) + 1; return acc;
    }, {} as Record<string, number>);

    const recurringCharges = Object.entries(merchantFrequency)
      .filter(([, count]) => count >= 3)
      .map(([merchant, count]) => {
        const avgAmount = Math.abs(transactions.filter(t => t.merchant === merchant).reduce((s, t) => s + t.amount, 0) / count);
        return { merchant, count, avgAmount };
      })
      .sort((a, b) => b.avgAmount - a.avgAmount)
      .slice(0, 5);

    return { thisMonthSpent, lastMonthSpent, changePercent, thisMonthCount, categoryData, totalCategorySpend, changes, recurringCharges };
  }, [transactions]);

  // ── Send message ──────────────────────────────────────────────────
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;
    const userMessage = input.trim();
    setInput('');
    setAssistantError('');
    const nextMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(nextMessages);
    setIsSending(true);
    try {
      const response = await services.rag.ask({ query: userMessage, messages: nextMessages.slice(-8), topK: 12 });
      setMessages(prev => [...prev, { role: 'assistant', content: response.answer }]);
    } catch (error) {
      setAssistantError(error instanceof Error ? error.message : 'Assistant failed');
      setMessages(prev => [...prev, { role: 'assistant', content: 'I could not answer right now. Check Ollama/Functions are running locally and try again.' }]);
    } finally {
      setIsSending(false);
    }
  };

  const examplePrompts = [
    { icon: <Info className="w-3.5 h-3.5" />, text: 'Why was last month expensive?' },
    { icon: <Activity className="w-3.5 h-3.5" />, text: 'Top 3 categories this month' },
    { icon: <Package className="w-3.5 h-3.5" />, text: 'How much did I spend on groceries last 30 days?' },
  ];

  const maxCategoryValue = insights.categoryData[0]?.value ?? 1;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Insights</h1>
        <p className="text-muted-foreground mt-1 text-sm">Analyze your spending and get AI-powered answers</p>
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-border -mb-px">
        {(['summary', 'assistant'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {t === 'assistant' && <Sparkles className="w-3.5 h-3.5" />}
            {t === 'summary' ? 'Summary' : 'AI Assistant'}
          </button>
        ))}
      </div>

      {/* ══════════ SUMMARY ══════════ */}
      {tab === 'summary' && (
        <div className="space-y-5">

          {/* Overview strip */}
          <div className="grid grid-cols-3 divide-x divide-border border border-border rounded-lg overflow-hidden">
            <div className="px-6 py-5 relative">
              <div className="absolute left-0 top-[20%] bottom-[20%] w-0.5 bg-foreground rounded-r" />
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">This Month</p>
              <p className="text-2xl font-semibold tracking-tight">${Math.round(insights.thisMonthSpent).toLocaleString()}</p>
              <p className={`text-xs mt-1 flex items-center gap-1 ${insights.changePercent > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                {insights.changePercent > 0
                  ? <TrendingUp className="w-3 h-3" />
                  : <TrendingDown className="w-3 h-3" />}
                {insights.changePercent > 0 ? '+' : ''}{Math.round(insights.changePercent)}% vs last month
              </p>
            </div>
            <div className="px-6 py-5">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Last Month</p>
              <p className="text-2xl font-semibold tracking-tight">${Math.round(insights.lastMonthSpent).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">{format(subMonths(new Date(), 1), 'MMMM yyyy')}</p>
            </div>
            <div className="px-6 py-5">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Transactions</p>
              <p className="text-2xl font-semibold tracking-tight">{insights.thisMonthCount}</p>
              <p className="text-xs text-muted-foreground mt-1">this month</p>
            </div>
          </div>

          {/* Charts */}
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Spending Breakdown</p>
          <div className="grid grid-cols-2 gap-4">

            {/* Donut */}
            <div className="border border-border rounded-lg bg-card overflow-hidden">
              <div className="px-5 pt-4 pb-0 flex items-center justify-between">
                <p className="text-sm font-semibold">By Category</p>
                <p className="text-xs font-mono text-muted-foreground">{format(new Date(), 'MMM yyyy')}</p>
              </div>
              <div className="p-5">
                {insights.categoryData.length > 0 ? (
                  <div className="space-y-4">
                    <div className="relative mx-auto w-[160px] h-[160px]">
                      <PieChart width={160} height={160}>
                        <Pie
                          data={insights.categoryData}
                          cx="50%" cy="50%"
                          innerRadius={52} outerRadius={72}
                          paddingAngle={2}
                          dataKey="value"
                          startAngle={90} endAngle={-270}
                        >
                          {insights.categoryData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => [`$${v}`, '']} contentStyle={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: '0.5rem', fontSize: '0.75rem' }} />
                      </PieChart>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-sm font-semibold tracking-tight">${Math.round(insights.thisMonthSpent).toLocaleString()}</span>
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">total</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {insights.categoryData.map((cat, i) => (
                        <LegendRow
                          key={cat.name}
                          name={cat.name}
                          pct={insights.totalCategorySpend > 0 ? Math.round((cat.value / insights.totalCategorySpend) * 100) : 0}
                          color={CHART_COLORS[i % CHART_COLORS.length]}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-[160px] flex items-center justify-center text-muted-foreground text-sm">No data</div>
                )}
              </div>
            </div>

            {/* Horizontal bars */}
            <div className="border border-border rounded-lg bg-card overflow-hidden">
              <div className="px-5 pt-4 pb-0 flex items-center justify-between">
                <p className="text-sm font-semibold">Top Categories</p>
                <p className="text-xs font-mono text-muted-foreground">{format(new Date(), 'MMM yyyy')}</p>
              </div>
              <div className="p-5">
                {insights.categoryData.length > 0 ? (
                  <div className="space-y-3.5">
                    {insights.categoryData.map((cat, i) => (
                      <HBar
                        key={cat.name}
                        name={cat.name}
                        value={cat.value}
                        max={maxCategoryValue}
                        color={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="h-[140px] flex items-center justify-center text-muted-foreground text-sm">No data</div>
                )}
              </div>
            </div>
          </div>

          {/* Notable Changes */}
          {insights.changes.length > 0 && (
            <>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Notable Changes</p>
              <div className="border border-border rounded-lg bg-card overflow-hidden divide-y divide-border">
                {insights.changes.map((item) => {
                  const isUp = item.change > 0;
                  return (
                    <div key={item.category} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isUp ? 'bg-orange-50' : 'bg-emerald-50'}`}>
                          {isUp
                            ? <ArrowUpRight className="w-4 h-4 text-orange-500" />
                            : <ArrowDownRight className="w-4 h-4 text-emerald-600" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{item.category}</p>
                          <p className="text-xs text-muted-foreground">
                            {isUp ? '+' : ''}${Math.round(Math.abs(item.delta))} {isUp ? 'more' : 'less'} than last month
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${isUp ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-700'}`}>
                          {isUp ? '+' : ''}{Math.round(item.change)}%
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">
                          ${Math.round(item.lastMonth)} → ${Math.round(item.thisMonth)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Recurring charges */}
          {insights.recurringCharges.length > 0 && (
            <>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Repeat className="w-3 h-3" />
                Recurring Charges
              </p>
              <div className="border border-border rounded-lg bg-card overflow-hidden">
                <div className="divide-y divide-border">
                  {insights.recurringCharges.map((charge) => (
                    <div key={charge.merchant} className="flex items-center justify-between px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={charge.merchant} />
                        <div>
                          <p className="text-sm font-medium">{charge.merchant}</p>
                          <p className="text-xs text-muted-foreground">{charge.count} transactions</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold font-mono">~${Math.round(charge.avgAmount)}/mo</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════ AI ASSISTANT ══════════ */}
      {tab === 'assistant' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-4 py-3 bg-muted rounded-lg text-sm text-muted-foreground">
            <Info className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Powered by local Ollama + Qdrant RAG — your data never leaves your machine.</span>
          </div>

          {assistantError && (
            <div className="flex items-center gap-2 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              <Info className="w-3.5 h-3.5 flex-shrink-0" />
              {assistantError}
            </div>
          )}

          <div className="border border-border rounded-lg bg-card overflow-hidden flex flex-col h-[600px]">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center pt-10 pb-6">
                  <div className="w-12 h-12 rounded-xl bg-foreground flex items-center justify-center mb-4">
                    <Sparkles className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <h3 className="text-base font-semibold tracking-tight mb-1">Financial Assistant</h3>
                  <p className="text-sm text-muted-foreground mb-6">Ask anything about your spending patterns</p>
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Try asking</p>
                  <div className="flex flex-col gap-2 w-full max-w-sm">
                    {examplePrompts.map(({ icon, text }) => (
                      <button
                        key={text}
                        onClick={() => setInput(text)}
                        className="flex items-center gap-2.5 px-4 py-2.5 border border-border rounded-lg text-sm text-left hover:bg-muted hover:border-border/80 transition-colors"
                      >
                        <span className="text-muted-foreground">{icon}</span>
                        {text}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((message, idx) => (
                  <div key={idx} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {message.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
                      </div>
                    )}
                    <div className={[
                      'max-w-[80%] px-4 py-3 rounded-lg text-sm whitespace-pre-wrap leading-relaxed',
                      message.role === 'user'
                        ? 'bg-foreground text-primary-foreground'
                        : 'bg-muted text-foreground',
                    ].join(' ')}>
                      {message.content}
                    </div>
                  </div>
                ))
              )}

              {isSending && (
                <div className="flex gap-3 justify-start">
                  <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                  <div className="bg-muted px-4 py-3 rounded-lg text-sm text-muted-foreground">
                    Thinking…
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-border p-4">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask about your spending…"
                  className="flex-1"
                  disabled={isSending || !currentUser}
                />
                <Button type="submit" size="icon" disabled={!input.trim() || isSending || !currentUser}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
              {!currentUser && <p className="text-xs text-muted-foreground mt-2">Connecting to local auth…</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
