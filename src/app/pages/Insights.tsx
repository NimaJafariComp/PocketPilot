import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Input } from '../components/ui/input';
import { Sparkles, TrendingUp, TrendingDown, Repeat, Send, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function Insights() {
  const { transactions } = useData();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  const insights = useMemo(() => {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const thisMonthTransactions = transactions.filter(t => {
      const date = parseISO(t.date);
      return date >= thisMonthStart && date <= thisMonthEnd && t.amount < 0;
    });

    const lastMonthTransactions = transactions.filter(t => {
      const date = parseISO(t.date);
      return date >= lastMonthStart && date <= lastMonthEnd && t.amount < 0;
    });

    const thisMonthSpent = Math.abs(thisMonthTransactions.reduce((sum, t) => sum + t.amount, 0));
    const lastMonthSpent = Math.abs(lastMonthTransactions.reduce((sum, t) => sum + t.amount, 0));
    const changePercent = lastMonthSpent > 0 ? ((thisMonthSpent - lastMonthSpent) / lastMonthSpent) * 100 : 0;

    // Category breakdown
    const categorySpending = thisMonthTransactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
      return acc;
    }, {} as Record<string, number>);

    const categoryData = Object.entries(categorySpending)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    // Category changes
    const lastMonthCategories = lastMonthTransactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
      return acc;
    }, {} as Record<string, number>);

    const biggestIncreases = Object.keys(categorySpending)
      .map(category => {
        const thisMonth = categorySpending[category];
        const lastMonth = lastMonthCategories[category] || 0;
        const change = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 100;
        return { category, change, amount: thisMonth - lastMonth };
      })
      .filter(c => c.change > 20)
      .sort((a, b) => b.change - a.change)
      .slice(0, 3);

    // Recurring charges
    const merchantFrequency = transactions.reduce((acc, t) => {
      acc[t.merchant] = (acc[t.merchant] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recurringCharges = Object.entries(merchantFrequency)
      .filter(([, count]) => count >= 3)
      .map(([merchant, count]) => {
        const avgAmount = Math.abs(
          transactions
            .filter(t => t.merchant === merchant)
            .reduce((sum, t) => sum + t.amount, 0) / count
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages([...messages, { role: 'user', content: userMessage }]);
    setInput('');

    // Simulate AI response
    setTimeout(() => {
      let response = '';
      
      if (userMessage.toLowerCase().includes('expensive') || userMessage.toLowerCase().includes('why')) {
        response = `Based on your transaction data, last month was expensive due to increased spending in ${
          insights.biggestIncreases[0]?.category || 'several categories'
        }. You spent $${Math.round(insights.lastMonthSpent)} compared to $${Math.round(insights.thisMonthSpent)} this month.`;
      } else if (userMessage.toLowerCase().includes('top') || userMessage.toLowerCase().includes('categories')) {
        const top3 = insights.categoryData.slice(0, 3);
        response = `Your top 3 spending categories this month are:\n1. ${top3[0]?.name}: $${top3[0]?.value}\n2. ${top3[1]?.name}: $${top3[1]?.value}\n3. ${top3[2]?.name}: $${top3[2]?.value}`;
      } else if (userMessage.toLowerCase().includes('groceries') || userMessage.toLowerCase().includes('dining')) {
        const category = userMessage.toLowerCase().includes('groceries') ? 'Groceries' : 'Dining';
        const spent = insights.categoryData.find(c => c.name === category)?.value || 0;
        response = `You've spent $${spent} on ${category} in the last 30 days, based on ${
          transactions.filter(t => t.category === category && t.amount < 0).length
        } transactions.`;
      } else {
        response = `I've analyzed your transaction data. This month you've spent $${Math.round(insights.thisMonthSpent)} across ${
          insights.categoryData.length
        } categories. Your largest category is ${insights.categoryData[0]?.name} at $${insights.categoryData[0]?.value}.`;
      }

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    }, 500);
  };

  const examplePrompts = [
    "Why was last month expensive?",
    "Top 3 categories this month",
    "How much did I spend on groceries last 30 days?",
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Insights</h1>
        <p className="text-gray-500 mt-1">
          Analyze your spending patterns and get AI-powered insights
        </p>
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
          {/* Monthly Summary */}
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
                      {insights.changePercent > 0 ? '+' : ''}{Math.round(insights.changePercent)}%
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

          {/* Category Breakdown */}
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
                  <div className="h-[300px] flex items-center justify-center text-gray-400">
                    No data available
                  </div>
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
                  <div className="h-[300px] flex items-center justify-center text-gray-400">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Biggest Increases */}
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
                          <p className="text-sm text-gray-500">
                            +${Math.round(item.amount)} from last month
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">+{Math.round(item.change)}%</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recurring Charges */}
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
              <strong>Disclaimer:</strong> This AI provides insights based on your transaction data only. 
              This is not financial advice. Consult a qualified financial advisor for personalized guidance.
            </AlertDescription>
          </Alert>

          <Card>
            <CardContent className="p-0">
              <div className="flex flex-col h-[600px]">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="w-8 h-8 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">AI Assistant</h3>
                      <p className="text-gray-500 mb-6">
                        Ask me anything about your spending patterns
                      </p>
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
                        className={`flex gap-3 ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {message.role === 'assistant' && (
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Sparkles className="w-4 h-4 text-blue-600" />
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] p-4 rounded-lg whitespace-pre-wrap ${
                            message.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          {message.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Input */}
                <div className="border-t p-4">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask about your spending..."
                      className="flex-1"
                    />
                    <Button type="submit" disabled={!input.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
