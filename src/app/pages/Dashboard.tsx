import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useData } from '../context/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Upload, 
  AlertTriangle,
  Target,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { generateSampleTransactions, generateSampleBudgets, generateSampleGoals } from '../utils/sampleData';

export function Dashboard() {
  const navigate = useNavigate();
  const { transactions, budgets, goals, importTransactions, addBudget, addGoal } = useData();

  const currentMonth = format(new Date(), 'yyyy-MM');

  const handleLoadSampleData = () => {
    const sampleTransactions = generateSampleTransactions(50);
    const sampleBudgets = generateSampleBudgets();
    const sampleGoals = generateSampleGoals();

    importTransactions(sampleTransactions);
    sampleBudgets.forEach(budget => addBudget(budget));
    sampleGoals.forEach(goal => addGoal(goal));
  };

  const monthlyData = useMemo(() => {
    const currentMonthStart = startOfMonth(new Date());
    const currentMonthEnd = endOfMonth(new Date());

    const monthTransactions = transactions.filter(t => {
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

    const monthBudgets = budgets.filter(b => b.month === currentMonth);
    const totalBudget = monthBudgets.reduce((sum, b) => sum + b.amount, 0);

    return {
      totalSpent,
      totalBudget,
      topCategories,
      monthTransactions,
      monthBudgets,
    };
  }, [transactions, budgets, currentMonth]);

  const budgetPercentage = monthlyData.totalBudget > 0 
    ? (monthlyData.totalSpent / monthlyData.totalBudget) * 100 
    : 0;

  const showWarning = budgetPercentage >= 80 && budgetPercentage < 100;
  const showOverBudget = budgetPercentage >= 100;

  const uncategorizedCount = transactions.filter(t => t.category === 'Uncategorized').length;

  // Show welcome screen if no data
  const hasNoData = transactions.length === 0 && budgets.length === 0 && goals.length === 0;

  if (hasNoData) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
            <Sparkles className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Welcome to PocketPilot</h1>
          <p className="text-gray-500 text-center max-w-md mb-8">
            Your personal finance companion. Import transactions, set budgets, track goals, and get AI-powered insights.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={() => navigate('/import')} size="lg">
              <Upload className="w-5 h-5 mr-2" />
              Import Transactions
            </Button>
            <Button onClick={handleLoadSampleData} variant="outline" size="lg">
              <Sparkles className="w-5 h-5 mr-2" />
              Try Sample Data
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Welcome back! Here's your financial overview.
          </p>
        </div>
        <Button onClick={() => navigate('/import')}>
          <Upload className="w-4 h-4 mr-2" />
          Import Transactions
        </Button>
      </div>

      {/* Alerts */}
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

      {/* Budget Overview */}
      <Card>
        <CardHeader>
          <CardTitle>This Month's Budget</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-3xl font-bold">
                ${Math.round(monthlyData.totalSpent).toLocaleString()}
              </div>
              <p className="text-sm text-gray-500">
                of ${monthlyData.totalBudget.toLocaleString()} budget
              </p>
            </div>
            <Badge variant={showOverBudget ? 'destructive' : showWarning ? 'secondary' : 'default'}>
              {Math.round(budgetPercentage)}%
            </Badge>
          </div>
          <Progress value={Math.min(budgetPercentage, 100)} />
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Top Categories */}
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
              <div className="h-[250px] flex items-center justify-center text-gray-400">
                No spending data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Goals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Goals</CardTitle>
            <Target className="w-5 h-5 text-gray-400" />
          </CardHeader>
          <CardContent>
            {goals.length > 0 ? (
              <div className="space-y-4">
                {goals.slice(0, 3).map(goal => {
                  const progress = (goal.currentAmount / goal.targetAmount) * 100;
                  return (
                    <div key={goal.id} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{goal.name}</span>
                        <span className="text-gray-500">
                          ${goal.currentAmount} / ${goal.targetAmount}
                        </span>
                      </div>
                      <Progress value={progress} />
                    </div>
                  );
                })}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => navigate('/goals')}
                >
                  View All Goals
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm mb-3">No goals yet</p>
                <Button size="sm" onClick={() => navigate('/goals')}>
                  Create Goal
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Transactions</CardTitle>
          {uncategorizedCount > 0 && (
            <Badge variant="secondary">
              {uncategorizedCount} Uncategorized
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.slice(0, 10).map(transaction => (
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
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => navigate('/transactions')}
              >
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

      {/* Load Sample Data */}
      <Card>
        <CardHeader>
          <CardTitle>Load Sample Data</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            className="w-full mt-4"
            onClick={handleLoadSampleData}
          >
            Load Sample Data
            <Sparkles className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}