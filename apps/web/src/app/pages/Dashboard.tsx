import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useData } from '../context/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import {
  Upload,
  AlertTriangle,
  Target,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { generateSampleTransactions, generateSampleBudgets, generateSampleGoals } from '../utils/sampleData';
import { toast } from 'sonner';

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
      await Promise.all(sampleBudgets.map((budget) => addBudget(budget)));
      await Promise.all(sampleGoals.map((goal) => addGoal(goal)));
      toast.success('Sample data loaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load sample data');
    }
  };

  const monthlyData = useMemo(() => {
    const currentMonthStart = startOfMonth(new Date());
    const currentMonthEnd = endOfMonth(new Date());

    const monthTransactions = transactions.filter((t) => {
      const date = parseISO(t.date);
      return date >= currentMonthStart && date <= currentMonthEnd && t.amount < 0;
    });

    const totalSpent = Math.abs(monthTransactions.reduce((sum, t) => sum + t.amount, 0));

    const categorySpending = monthTransactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
      return acc;
    }, {} as Record<string, number>);

    const topCategories = Object.entries(categorySpending)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name, value: Math.round(value) }));

    const monthBudgets = budgets.filter((b) => b.month === currentMonth);
    const totalBudget = monthBudgets.reduce((sum, b) => sum + b.amount, 0);

    return {
      totalSpent,
      totalBudget,
      topCategories,
    };
  }, [transactions, budgets, currentMonth]);

  const budgetPercentage = monthlyData.totalBudget > 0
    ? (monthlyData.totalSpent / monthlyData.totalBudget) * 100
    : 0;

  const showWarning = budgetPercentage >= 80 && budgetPercentage < 100;
  const showOverBudget = budgetPercentage >= 100;

  const uncategorizedCount = transactions.filter((t) => t.category === 'Uncategorized').length;
  const hasNoData = transactions.length === 0 && budgets.length === 0 && goals.length === 0;

  if (hasNoData) {
    return (
        <div className="min-h-screen bg-background">
          {/* Hero */}
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
              Import your transactions, set smart budgets, track goals, and get AI-powered insights that actually make sense.
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

          {/* Feature cards */}
          <div className="max-w-4xl mx-auto px-6 pb-16">
            <p className="text-center text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">
              Everything you need
            </p>
            <h2 className="text-center text-2xl font-semibold tracking-tight mb-10">
              Built for real financial life
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
              {[
                {
                  title: 'Smart Categorization',
                  desc: 'Transactions are automatically sorted.',
                },
                {
                  title: 'Budget Tracking',
                  desc: 'Set monthly budgets per category.',
                },
                {
                  title: 'Goal Milestones',
                  desc: 'Track savings goals with visual progress. Emergency fund, vacation, home; all in one place.',
                },
                {
                  title: 'AI Insights',
                  desc: 'Weekly summaries and actionable tips based on your spending habits.',
                },
              ].map((f) => (
                  <div
                      key={f.title}
                      className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="text-2xl mb-3">{f.icon}</div>
                    <h3 className="font-semibold text-sm mb-1.5">{f.title}</h3>
                    <p className="text-muted-foreground text-xs leading-relaxed">{f.desc}</p>
                  </div>
              ))}
            </div>

            {/* Steps */}
            <p className="text-center text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">
              How it works
            </p>
            <h2 className="text-center text-2xl font-semibold tracking-tight mb-10">
              Up and running in 3 steps
            </h2>
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

  return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-gray-500 mt-1">Welcome back! Here's your financial overview.</p>
          </div>
          <Button onClick={() => navigate('/import')}>
            <Upload className="w-4 h-4 mr-2" />
            Import Transactions
          </Button>
        </div>

        {showOverBudget && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                You've exceeded your monthly budget by ${Math.round(monthlyData.totalSpent - monthlyData.totalBudget)}
              </AlertDescription>
            </Alert>
        )}
        {showWarning && !showOverBudget && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <AlertDescription className="text-orange-900">
                You've used {Math.round(budgetPercentage)}% of your monthly budget
              </AlertDescription>
            </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>This Month's Budget</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-3xl font-bold">${Math.round(monthlyData.totalSpent).toLocaleString()}</div>
                <p className="text-sm text-gray-500">of ${monthlyData.totalBudget.toLocaleString()} budget</p>
              </div>
              <Badge variant={showOverBudget ? 'destructive' : showWarning ? 'secondary' : 'default'}>
                {Math.round(budgetPercentage)}%
              </Badge>
            </div>
            <Progress value={Math.min(budgetPercentage, 100)} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Top Spending Categories</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData.topCategories.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={monthlyData.topCategories}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => `$${value}`} />
                      <Bar dataKey="value" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
              ) : (
                  <div className="h-[250px] flex items-center justify-center text-gray-400">No spending data yet</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Goals</CardTitle>
              <Target className="w-5 h-5 text-gray-400" />
            </CardHeader>
            <CardContent>
              {goals.length > 0 ? (
                  <div className="space-y-4">
                    {goals.slice(0, 3).map((goal) => {
                      const progress = (goal.currentAmount / goal.targetAmount) * 100;
                      return (
                          <div key={goal.id} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">{goal.name}</span>
                              <span className="text-gray-500">${goal.currentAmount} / ${goal.targetAmount}</span>
                            </div>
                            <Progress value={progress} />
                          </div>
                      );
                    })}
                    <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => navigate('/goals')}>
                      View All Goals
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
              ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400 text-sm mb-3">No goals yet</p>
                    <Button size="sm" onClick={() => navigate('/goals')}>Create Goal</Button>
                  </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            {uncategorizedCount > 0 && <Badge variant="secondary">{uncategorizedCount} Uncategorized</Badge>}
          </CardHeader>
          <CardContent>
            {transactions.length > 0 ? (
                <div className="space-y-3">
                  {transactions.slice(0, 10).map((transaction) => (
                      <div
                          key={transaction.id}
                          className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                          onClick={() => navigate('/transactions')}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{transaction.merchant}</p>
                            {transaction.category === 'Uncategorized' && (
                                <Badge variant="outline" className="text-xs">Uncategorized</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            {format(parseISO(transaction.date), 'MMM dd, yyyy')} · {transaction.category}
                          </p>
                        </div>
                        <div className={`font-semibold ${transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {transaction.amount < 0 ? '-' : '+'}${Math.abs(transaction.amount).toFixed(2)}
                        </div>
                      </div>
                  ))}
                  <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/transactions')}>
                    View All Transactions
                  </Button>
                </div>
            ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-3">No transactions yet</p>
                  <Button onClick={() => navigate('/import')}>
                    <Upload className="w-4 h-4 mr-2" />
                    Import Transactions
                  </Button>
                </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Load Sample Data</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full mt-4" onClick={handleLoadSampleData}>
              Load Sample Data
              <Sparkles className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
  );
}