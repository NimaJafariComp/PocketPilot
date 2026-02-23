import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Input } from '../components/ui/input';
import { Sparkles, TrendingUp, TrendingDown, Repeat, Send, Info } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { services } from '../lib/services';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function Insights() {
  const { transactions, budgets, goals } = useData();
  const { user: currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [assistantError, setAssistantError] = useState('');

  const ragDocuments = useMemo(() => {
    const identityDoc = {
      id: 'insight-user-identity',
      kind: 'insight' as const,
      text: [
        'Authenticated User Context',
        `DisplayName: ${currentUser?.displayName || 'Unknown'}`,
        `Email: ${currentUser?.email || 'Unknown'}`,
        `Uid: ${currentUser?.id || 'Unknown'}`,
      ].join('\n'),
      tags: ['insight', 'identity', 'user-profile'],
    };

    const yearlySummaryDocs = (() => {
      const years = new Set<number>();
      transactions.forEach((transaction) => {
        const date = parseISO(transaction.date);
        if (!Number.isNaN(date.getTime())) {
          years.add(date.getFullYear());
        }
      });

      return Array.from(years)
        .sort((a, b) => b - a)
        .map((year) => {
          const yearTransactions = transactions.filter((transaction) => {
            const date = parseISO(transaction.date);
            return !Number.isNaN(date.getTime()) && date.getFullYear() === year;
          });
          const expenses = yearTransactions.filter((transaction) => transaction.amount < 0);
          const incomes = yearTransactions.filter((transaction) => transaction.amount > 0);
          const totalExpenses = Math.abs(expenses.reduce((sum, transaction) => sum + transaction.amount, 0));
          const totalIncome = incomes.reduce((sum, transaction) => sum + transaction.amount, 0);
          const largestExpense = expenses
            .slice()
            .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0];

          return {
            id: `insight-year-${year}`,
            kind: 'insight' as const,
            text: [
              `Yearly Financial Summary: ${year}`,
              `TotalIncome: $${totalIncome.toFixed(2)}`,
              `TotalExpenses: $${totalExpenses.toFixed(2)}`,
              `NetCashFlow: $${(totalIncome - totalExpenses).toFixed(2)}`,
              `TransactionCount: ${yearTransactions.length}`,
              `LargestExpense: ${
                largestExpense
                  ? `${largestExpense.merchant} (${largestExpense.category}) $${Math.abs(largestExpense.amount).toFixed(2)}`
                  : 'None'
              }`,
            ].join('\n'),
            tags: ['insight', 'yearly-summary', String(year)],
          };
        });
    })();

    const allTimeLargestExpensesDoc = {
      id: 'insight-largest-expenses-all-time',
      kind: 'insight' as const,
      text: [
        'All-Time Largest Expenses',
        ...transactions
          .filter((transaction) => transaction.amount < 0)
          .slice()
          .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
          .slice(0, 10)
          .map(
            (transaction) =>
              `${transaction.date} | ${transaction.merchant} | ${transaction.category} | $${Math.abs(transaction.amount).toFixed(2)}`,
          ),
      ].join('\n'),
      tags: ['insight', 'largest-expenses', 'all-time'],
    };

    const monthlySummaryDocs = Array.from({ length: 6 }, (_, offset) => {
      const monthDate = subMonths(new Date(), offset);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthId = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = monthStart.toLocaleString('en-US', { month: 'long', year: 'numeric' });

      const monthTransactions = transactions.filter((transaction) => {
        const date = parseISO(transaction.date);
        return date >= monthStart && date <= monthEnd;
      });

      const expenseTransactions = monthTransactions.filter((transaction) => transaction.amount < 0);
      const incomeTransactions = monthTransactions.filter((transaction) => transaction.amount > 0);
      const totalExpenses = Math.abs(expenseTransactions.reduce((sum, transaction) => sum + transaction.amount, 0));
      const totalIncome = incomeTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);

      const categoryTotals = expenseTransactions.reduce(
        (acc, transaction) => {
          acc[transaction.category] = (acc[transaction.category] || 0) + Math.abs(transaction.amount);
          return acc;
        },
        {} as Record<string, number>,
      );

      const topCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([category, amount]) => `${category}: $${amount.toFixed(2)}`);

      const largestExpenses = expenseTransactions
        .slice()
        .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
        .slice(0, 3)
        .map((transaction) => `${transaction.merchant} (${transaction.category}): $${Math.abs(transaction.amount).toFixed(2)}`);

      return {
        id: `insight-month-${monthId}`,
        kind: 'insight' as const,
        text: [
          `Monthly Spending Summary: ${monthLabel}`,
          `MonthId: ${monthId}`,
          `TotalExpenses: $${totalExpenses.toFixed(2)}`,
          `TotalIncome: $${totalIncome.toFixed(2)}`,
          `NetCashFlow: $${(totalIncome - totalExpenses).toFixed(2)}`,
          `TransactionCount: ${monthTransactions.length}`,
          `TopExpenseCategories: ${topCategories.length > 0 ? topCategories.join('; ') : 'None'}`,
          `LargestExpenses: ${largestExpenses.length > 0 ? largestExpenses.join('; ') : 'None'}`,
        ].join('\n'),
        tags: ['insight', 'monthly-summary', monthId, monthStart.toLocaleString('en-US', { month: 'long' }).toLowerCase()],
      };
    });

    const transactionDocs = transactions.map((transaction) => ({
      id: `tx-${transaction.id}`,
      kind: 'transaction' as const,
      text: [
        `Transaction ${transaction.id}`,
        `Date: ${transaction.date}`,
        `Merchant: ${transaction.merchant}`,
        `Category: ${transaction.category}`,
        `Amount: ${transaction.amount}`,
        transaction.notes ? `Notes: ${transaction.notes}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      tags: [transaction.category.toLowerCase(), 'transaction'],
    }));

    const budgetDocs = budgets.map((budget) => ({
      id: `budget-${budget.id}`,
      kind: 'budget' as const,
      text: [
        `Budget ${budget.id}`,
        `Category: ${budget.category}`,
        `Month: ${budget.month}`,
        `Amount: ${budget.amount}`,
        `WarningThreshold: ${budget.warningThreshold}`,
        `LimitThreshold: ${budget.limitThreshold}`,
      ].join('\n'),
      tags: [budget.category.toLowerCase(), budget.month, 'budget'],
    }));

    const goalDocs = goals.map((goal) => ({
      id: `goal-${goal.id}`,
      kind: 'goal' as const,
      text: [
        `Goal ${goal.id}`,
        `Name: ${goal.name}`,
        `TargetAmount: ${goal.targetAmount}`,
        `CurrentAmount: ${goal.currentAmount}`,
        goal.deadline ? `Deadline: ${goal.deadline}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      tags: ['goal', goal.name.toLowerCase()],
    }));

    return [
      identityDoc,
      allTimeLargestExpensesDoc,
      ...yearlySummaryDocs,
      ...monthlySummaryDocs,
      ...transactionDocs,
      ...budgetDocs,
      ...goalDocs,
    ];
  }, [transactions, budgets, goals, currentUser]);

  const insights = useMemo(() => {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const thisMonthTransactions = transactions.filter((t) => {
      const date = parseISO(t.date);
      return date >= thisMonthStart && date <= thisMonthEnd && t.amount < 0;
    });

    const lastMonthTransactions = transactions.filter((t) => {
      const date = parseISO(t.date);
      return date >= lastMonthStart && date <= lastMonthEnd && t.amount < 0;
    });

    const thisMonthSpent = Math.abs(thisMonthTransactions.reduce((sum, t) => sum + t.amount, 0));
    const lastMonthSpent = Math.abs(lastMonthTransactions.reduce((sum, t) => sum + t.amount, 0));
    const changePercent = lastMonthSpent > 0 ? ((thisMonthSpent - lastMonthSpent) / lastMonthSpent) * 100 : 0;

    const categorySpending = thisMonthTransactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
      return acc;
    }, {} as Record<string, number>);

    const categoryData = Object.entries(categorySpending)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const lastMonthCategories = lastMonthTransactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
      return acc;
    }, {} as Record<string, number>);

    const biggestIncreases = Object.keys(categorySpending)
      .map((category) => {
        const thisMonth = categorySpending[category];
        const lastMonth = lastMonthCategories[category] || 0;
        const change = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 100;
        return { category, change, amount: thisMonth - lastMonth };
      })
      .filter((c) => c.change > 20)
      .sort((a, b) => b.change - a.change)
      .slice(0, 3);

    const merchantFrequency = transactions.reduce((acc, t) => {
      acc[t.merchant] = (acc[t.merchant] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recurringCharges = Object.entries(merchantFrequency)
      .filter(([, count]) => count >= 3)
      .map(([merchant, count]) => {
        const avgAmount = Math.abs(
          transactions.filter((t) => t.merchant === merchant).reduce((sum, t) => sum + t.amount, 0) /
            count,
        );
        return { merchant, count, avgAmount };
      })
      .sort((a, b) => b.avgAmount - a.avgAmount)
      .slice(0, 5);

    return {
      thisMonthSpent,
      lastMonthSpent,
      changePercent,
      categoryData,
      biggestIncreases,
      recurringCharges,
    };
  }, [transactions]);

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
      const response = await services.rag.ask({
        query: userMessage,
        messages: nextMessages.slice(-8),
        documents: ragDocuments,
        topK: 20,
      });

      setMessages((prev) => [...prev, { role: 'assistant', content: response.answer }]);
    } catch (error) {
      setAssistantError(error instanceof Error ? error.message : 'Assistant failed');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I could not answer right now. Check Ollama/Functions are running locally and try again.',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const examplePrompts = [
    'Why was last month expensive?',
    'Top 3 categories this month',
    'How much did I spend on groceries last 30 days?',
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Insights</h1>
        <p className="text-gray-500 mt-1">Analyze your spending patterns and get AI-powered insights</p>
      </div>

      <Tabs defaultValue="summary" className="space-y-6">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="assistant">
            <Sparkles className="w-4 h-4 mr-2" />
            AI Assistant
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">This Month</p>
                  <p className="text-3xl font-bold">${Math.round(insights.thisMonthSpent).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Last Month</p>
                  <p className="text-3xl font-bold">${Math.round(insights.lastMonthSpent).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Change</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-3xl font-bold ${insights.changePercent > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {insights.changePercent > 0 ? '+' : ''}
                      {Math.round(insights.changePercent)}%
                    </p>
                    {insights.changePercent > 0 ? (
                      <TrendingUp className="w-6 h-6 text-red-600" />
                    ) : (
                      <TrendingDown className="w-6 h-6 text-green-600" />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Spending by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {insights.categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={insights.categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {insights.categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `$${value}`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-400">No data available</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Categories</CardTitle>
              </CardHeader>
              <CardContent>
                {insights.categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={insights.categoryData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => `$${value}`} />
                      <Bar dataKey="value" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-400">No data available</div>
                )}
              </CardContent>
            </Card>
          </div>

          {insights.biggestIncreases.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Biggest Increases</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.biggestIncreases.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-orange-600" />
                        <div>
                          <p className="font-medium">{item.category}</p>
                          <p className="text-sm text-gray-500">+${Math.round(item.amount)} from last month</p>
                        </div>
                      </div>
                      <Badge variant="secondary">+{Math.round(item.change)}%</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {insights.recurringCharges.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Repeat className="w-5 h-5" />
                  Recurring Charges
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.recurringCharges.map((charge, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{charge.merchant}</p>
                        <p className="text-sm text-gray-500">{charge.count} transactions</p>
                      </div>
                      <p className="font-semibold">~${Math.round(charge.avgAmount)}/mo</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="assistant" className="space-y-6">
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              <strong>Local AI:</strong> This assistant uses local Ollama + Qdrant RAG over your user data.
            </AlertDescription>
          </Alert>

          {assistantError && (
            <Alert variant="destructive">
              <AlertDescription>{assistantError}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardContent className="p-0">
              <div className="flex flex-col h-[600px]">
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="w-8 h-8 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">RAG Assistant</h3>
                      <p className="text-gray-500 mb-6">Ask me anything about your spending patterns</p>
                      <div className="space-y-2 max-w-md mx-auto">
                        <p className="text-sm font-medium text-gray-700">Try asking:</p>
                        {examplePrompts.map((prompt, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => setInput(prompt)}
                          >
                            {prompt}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    messages.map((message, idx) => (
                      <div
                        key={idx}
                        className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {message.role === 'assistant' && (
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Sparkles className="w-4 h-4 text-blue-600" />
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] p-4 rounded-lg whitespace-pre-wrap ${
                            message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          {message.content}
                        </div>
                      </div>
                    ))
                  )}

                  {isSending && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="bg-gray-100 text-gray-900 max-w-[80%] p-4 rounded-lg">
                        Thinking with local context...
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t p-4">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask about your spending..."
                      className="flex-1"
                      disabled={isSending || !currentUser}
                    />
                    <Button type="submit" disabled={!input.trim() || isSending || !currentUser}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                  {!currentUser && <p className="text-xs text-gray-500 mt-2">Connecting to local auth...</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
