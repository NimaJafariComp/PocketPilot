import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useData } from '../context/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import {
  Upload,
  AlertTriangle,
  Info,
  Target,
  ArrowRight,
  Sparkles,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import {
  generateSampleTransactions,
  generateSampleBudgets,
  generateSampleGoals,
} from '../utils/sampleData';
import { toast } from 'sonner';

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--popover)',
  color: 'var(--popover-foreground)',
  border: '1px solid var(--border)',
  borderRadius: '0.75rem',
  fontSize: '0.8rem',
  boxShadow: '0 18px 40px rgba(2, 6, 23, 0.24)',
};

export function Dashboard() {
  const navigate = useNavigate();
  const { transactions, budgets, goals, importTransactions, addBudget, addGoal } = useData();

  const currentMonth = format(new Date(), 'yyyy-MM');

  const handleLoadSampleData = async () => {
    try {
      const sampleTransactions = generateSampleTransactions(50);
      const sampleBudgets = generateSampleBudgets();
      const sampleGoals = generateSampleGoals();
      await importTransactions(sampleTransactions);
      await Promise.all(sampleBudgets.map((b) => addBudget(b)));
      await Promise.all(sampleGoals.map((g) => addGoal(g)));
      toast.success('Sample data loaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load sample data');
    }
  };

  const monthlyData = useMemo(() => {
    const currentMonthStart = startOfMonth(new Date());
    const currentMonthEnd = endOfMonth(new Date());

    const monthExpenses = transactions.filter((t) => {
      const date = parseISO(t.date);
      return date >= currentMonthStart && date <= currentMonthEnd && t.amount < 0;
    });

    const totalSpent = Math.abs(monthExpenses.reduce((sum, t) => sum + t.amount, 0));

    const totalIncome = transactions
      .filter((t) => {
        const date = parseISO(t.date);
        return date >= currentMonthStart && date <= currentMonthEnd && t.amount > 0;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const categorySpending = monthExpenses.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
      return acc;
    }, {} as Record<string, number>);

    const topCategories = Object.entries(categorySpending)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([name, value]) => ({ name, value: Math.round(value) }));

    const monthBudgets = budgets.filter((b) => b.month === currentMonth);
    const totalBudget = monthBudgets.reduce((sum, b) => sum + b.amount, 0);

    return { totalSpent, totalBudget, totalIncome, topCategories };
  }, [transactions, budgets, currentMonth]);

  const budgetPct = monthlyData.totalBudget > 0
    ? (monthlyData.totalSpent / monthlyData.totalBudget) * 100
    : 0;
  const remaining = monthlyData.totalBudget - monthlyData.totalSpent;
  const showWarning = budgetPct >= 80 && budgetPct < 100;
  const showOverBudget = budgetPct >= 100;

  const uncategorizedCount = transactions.filter((t) => t.category === 'Uncategorized').length;
  const hasNoData = transactions.length === 0 && budgets.length === 0 && goals.length === 0;

  // ── Empty state ──────────────────────────────────────────────
  if (hasNoData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex flex-col items-center text-center px-6 pt-20 pb-12 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground border border-border px-3 py-1.5 rounded-full text-xs font-medium mb-8">
            <Sparkles className="w-3 h-3" />
            AI-powered financial clarity
          </div>
          <h1 className="text-5xl font-semibold tracking-tight mb-5 leading-tight">
            Your money,{' '}
            <span className="italic text-muted-foreground">finally</span>{' '}
            under control
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-md mb-10">
            Import your transactions, set smart budgets, track goals, and get AI-powered insights.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <Button onClick={() => navigate('/import')} size="lg" className="gap-2">
              <Upload className="w-4 h-4" />
              Import Transactions
            </Button>
            <Button onClick={handleLoadSampleData} variant="outline" size="lg" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Try Sample Data
            </Button>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap justify-center">
            Supports
            {['CSV', 'OFX', 'QFX', 'QBO'].map((f) => (
              <span key={f} className="bg-muted px-2 py-0.5 rounded-full border border-border font-medium">{f}</span>
            ))}
          </p>
        </div>

        <div className="max-w-4xl mx-auto px-6 pb-16">
          <p className="text-center text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">
            Everything you need
          </p>
          <h2 className="text-center text-2xl font-semibold tracking-tight mb-10">
            Built for real financial life
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
            {[
              { title: 'Smart Categorization', desc: 'Transactions are automatically sorted.' },
              { title: 'Budget Tracking', desc: 'Set monthly budgets per category.' },
              { title: 'Goal Milestones', desc: 'Track savings goals with visual progress. Emergency fund, vacation, home; all in one place.' },
              { title: 'AI Insights', desc: 'Weekly summaries and actionable tips based on your spending habits.' },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/25 hover:shadow-lg hover:shadow-primary/10"
              >
                <h3 className="font-semibold text-sm mb-1.5">{f.title}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">How it works</p>
          <h2 className="text-center text-2xl font-semibold tracking-tight mb-10">Up and running in 3 steps</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto">
            {[
              { n: '1', title: 'Import', desc: 'Upload a CSV or connect your bank securely' },
              { n: '2', title: 'Categorize', desc: 'AI sorts your transactions. Review and adjust' },
              { n: '3', title: 'Understand', desc: 'See insights and take control of your money' },
            ].map((s) => (
              <div key={s.n} className="flex flex-col items-center text-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                  {s.n}
                </div>
                <div>
                  <p className="font-semibold text-sm">{s.title}</p>
                  <p className="text-muted-foreground text-xs mt-1 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Filled dashboard ─────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {format(new Date(), 'MMMM yyyy')}
          </p>
        </div>
        <Button onClick={() => navigate('/import')}>
          <Upload className="w-4 h-4 mr-2" />
          Import Transactions
        </Button>
      </div>

      {/* ── Alerts ── */}
      {(showOverBudget || showWarning || uncategorizedCount > 0) && (
        <div className="space-y-2">
          {showOverBudget && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border text-sm bg-destructive/5 border-destructive/20 text-destructive">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="flex-1">
                You've exceeded your monthly budget by{' '}
                <strong>${Math.round(monthlyData.totalSpent - monthlyData.totalBudget).toLocaleString()}</strong>.
              </span>
              <button
                className="text-xs font-medium underline underline-offset-2 opacity-70 hover:opacity-100 shrink-0"
                onClick={() => navigate('/budgets')}
              >
                Review budgets
              </button>
            </div>
          )}
          {showWarning && (
            <div className="flex items-center gap-3 rounded-lg border border-warning/25 bg-warning/12 px-4 py-3 text-sm text-warning-foreground">
              <Info className="w-4 h-4 shrink-0" />
              <span className="flex-1">
                You've used <strong>{Math.round(budgetPct)}%</strong> of your monthly budget — only{' '}
                <strong>${Math.round(remaining).toLocaleString()}</strong> remaining.
              </span>
              <button
                className="text-xs font-medium underline underline-offset-2 opacity-70 hover:opacity-100 shrink-0"
                onClick={() => navigate('/budgets')}
              >
                View budgets
              </button>
            </div>
          )}
          {uncategorizedCount > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border text-sm bg-muted/50 border-border text-muted-foreground">
              <Info className="w-4 h-4 shrink-0" />
              <span className="flex-1">
                <strong className="text-foreground">{uncategorizedCount}</strong>{' '}
                transaction{uncategorizedCount !== 1 ? 's' : ''} still need categorizing.
              </span>
              <button
                className="text-xs font-medium underline underline-offset-2 opacity-70 hover:opacity-100 shrink-0"
                onClick={() => navigate('/transactions')}
              >
                Categorize
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Overview hero ── */}
      {monthlyData.totalBudget > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-6 items-start">

              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
                  Total spent this month
                </p>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-bold tracking-tight">
                    ${Math.round(monthlyData.totalSpent).toLocaleString()}
                  </span>
                  <span className="text-muted-foreground text-base">
                    / ${monthlyData.totalBudget.toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {remaining >= 0 ? (
                    <>
                      <span className="text-foreground font-medium">
                        ${Math.round(remaining).toLocaleString()}
                      </span>{' '}
                      still available across all budgets
                    </>
                  ) : (
                    <span className="text-destructive font-medium">
                      ${Math.round(Math.abs(remaining)).toLocaleString()} over budget
                    </span>
                  )}
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span>{Math.round(budgetPct)}% used</span>
                    <span>100%</span>
                  </div>
                  <Progress
                    value={Math.min(budgetPct, 100)}
                    className={`h-2 ${
                      showOverBudget
                        ? '[&>div]:bg-destructive'
                        : showWarning
                        ? '[&>div]:bg-warning'
                        : ''
                    }`}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4 pl-6 border-l shrink-0">
                {monthlyData.totalIncome > 0 && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-0.5 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Income
                    </p>
                    <p className="text-2xl font-bold tracking-tight text-success">
                      ${Math.round(monthlyData.totalIncome).toLocaleString()}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-0.5 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" />
                    Spent
                  </p>
                  <p className="text-2xl font-bold tracking-tight">
                    ${Math.round(monthlyData.totalSpent).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-0.5">
                    Remaining
                  </p>
                  <p className={`text-2xl font-bold tracking-tight ${remaining < 0 ? 'text-destructive' : ''}`}>
                    ${Math.round(Math.abs(remaining)).toLocaleString()}
                  </p>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Chart + Goals ── */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

        <Card className="md:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Top Spending Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.topCategories.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={monthlyData.topCategories}
                  margin={{ top: 4, right: 4, left: -20, bottom: 48 }}
                  barCategoryGap="35%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}`}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}`, 'Spent']}
                    contentStyle={TOOLTIP_STYLE}
                    cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {monthlyData.topCategories.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                No spending data yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Goals</CardTitle>
            <Target className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {goals.length > 0 ? (
              <div className="space-y-5">
                {goals.slice(0, 3).map((goal) => {
                  const pct = (goal.currentAmount / goal.targetAmount) * 100;
                  return (
                    <div key={goal.id} className="space-y-1.5">
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm font-medium">{goal.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ${goal.currentAmount.toLocaleString()} / ${goal.targetAmount.toLocaleString()}
                        </span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                      <p className="text-xs text-muted-foreground text-right">{Math.round(pct)}%</p>
                    </div>
                  );
                })}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs mt-1"
                  onClick={() => navigate('/goals')}
                >
                  View All Goals
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </div>
            ) : (
              <div className="h-[180px] flex flex-col items-center justify-center gap-3">
                <p className="text-muted-foreground text-sm">No goals yet</p>
                <Button size="sm" onClick={() => navigate('/goals')}>Create Goal</Button>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* ── Recent Transactions ── */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
          {uncategorizedCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {uncategorizedCount} uncategorized
            </Badge>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length > 0 ? (
            <>
              <div className="divide-y divide-border">
                {transactions.slice(0, 8).map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between px-6 py-3 hover:bg-muted/40 cursor-pointer transition-colors"
                    onClick={() => navigate('/transactions')}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{transaction.merchant}</p>
                        {transaction.category === 'Uncategorized' && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            Uncategorized
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(parseISO(transaction.date), 'MMM d, yyyy')}
                        <span className="mx-1.5">·</span>
                        {transaction.category}
                      </p>
                    </div>
                    <span
                      className={`font-semibold text-sm ml-4 shrink-0 ${
                        transaction.amount < 0 ? 'text-destructive' : 'text-success'
                      }`}
                    >
                      {transaction.amount < 0 ? '−' : '+'}${Math.abs(transaction.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="px-6 py-4">
                <Button
                  variant="outline"
                  className="w-full text-sm"
                  onClick={() => navigate('/transactions')}
                >
                  View All Transactions
                </Button>
              </div>
            </>
          ) : (
            <div className="py-12 text-center">
              <p className="text-muted-foreground text-sm mb-3">No transactions yet</p>
              <Button onClick={() => navigate('/import')}>
                <Upload className="w-4 h-4 mr-2" />
                Import Transactions
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
