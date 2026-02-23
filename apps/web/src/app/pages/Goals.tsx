import { useState } from 'react';
import { useData } from '../context/DataContext';
import { Goal, Contribution } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Plus, Target, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function Goals() {
  const { goals, addGoal, updateGoal } = useData();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isContributeDialogOpen, setIsContributeDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    deadline: '',
  });
  const [contributionAmount, setContributionAmount] = useState('');

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addGoal({
        name: formData.name,
        targetAmount: parseFloat(formData.targetAmount),
        currentAmount: 0,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : undefined,
        contributions: [],
      });
      setIsCreateDialogOpen(false);
      setFormData({ name: '', targetAmount: '', deadline: '' });
      toast.success('Goal created successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create goal');
    }
  };

  const handleAddContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;

    const amount = parseFloat(contributionAmount);
    const newContribution: Contribution = {
      id: Date.now().toString(),
      amount,
      date: new Date().toISOString(),
    };

    try {
      await updateGoal(selectedGoal.id, {
        currentAmount: selectedGoal.currentAmount + amount,
        contributions: [...selectedGoal.contributions, newContribution],
      });

      setIsContributeDialogOpen(false);
      setContributionAmount('');
      setSelectedGoal(null);
      toast.success('Contribution added successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add contribution');
    }
  };

  const openContributeDialog = (goal: Goal) => {
    setSelectedGoal(goal);
    setIsContributeDialogOpen(true);
  };

  const getProgressChartData = (goal: Goal) => {
    if (goal.contributions.length === 0) return [];

    const sorted = [...goal.contributions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let runningTotal = 0;
    return sorted.map((contrib) => {
      runningTotal += contrib.amount;
      return {
        date: format(parseISO(contrib.date), 'MMM dd'),
        amount: runningTotal,
      };
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Savings Goals</h1>
          <p className="text-gray-500 mt-1">Track your progress toward financial goals</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div className="space-y-2">
                <Label>Goal Name</Label>
                <Input
                  placeholder="e.g., Emergency Fund, Vacation"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Target Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="5000.00"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Deadline (Optional)</Label>
                <Input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">Create Goal</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {goals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map((goal) => {
            const progress = (goal.currentAmount / goal.targetAmount) * 100;
            const chartData = getProgressChartData(goal);

            return (
              <Card key={goal.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Target className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{goal.name}</CardTitle>
                        {goal.deadline && (
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <Calendar className="w-3 h-3" />
                            Due {format(parseISO(goal.deadline), 'MMM dd, yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant={progress >= 100 ? 'default' : 'secondary'}>{Math.round(progress)}%</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex justify-between items-baseline mb-2">
                      <div className="text-2xl font-bold">${goal.currentAmount.toLocaleString()}</div>
                      <div className="text-gray-500">of ${goal.targetAmount.toLocaleString()}</div>
                    </div>
                    <Progress value={Math.min(progress, 100)} />
                    <p className="text-sm text-gray-500 mt-2">
                      ${(goal.targetAmount - goal.currentAmount).toLocaleString()} remaining
                    </p>
                  </div>

                  {chartData.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Progress Over Time
                      </h4>
                      <ResponsiveContainer width="100%" height={150}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" style={{ fontSize: 12 }} />
                          <YAxis style={{ fontSize: 12 }} />
                          <Tooltip formatter={(value) => `$${value}`} />
                          <Line
                            type="monotone"
                            dataKey="amount"
                            stroke="#3B82F6"
                            strokeWidth={2}
                            dot={{ fill: '#3B82F6' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {goal.contributions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-3">Recent Contributions</h4>
                      <div className="space-y-2">
                        {goal.contributions
                          .slice()
                          .reverse()
                          .slice(0, 3)
                          .map((contrib) => (
                            <div
                              key={contrib.id}
                              className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded"
                            >
                              <span className="text-gray-500">{format(parseISO(contrib.date), 'MMM dd, yyyy')}</span>
                              <span className="font-medium text-green-600">+${contrib.amount.toFixed(2)}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  <Button className="w-full" onClick={() => openContributeDialog(goal)} disabled={progress >= 100}>
                    <DollarSign className="w-4 h-4 mr-2" />
                    Add Contribution
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No goals yet</h3>
            <p className="text-gray-500 mb-4">Create your first savings goal to start tracking your progress</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Goal
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={isContributeDialogOpen} onOpenChange={setIsContributeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contribution</DialogTitle>
          </DialogHeader>
          {selectedGoal && (
            <form onSubmit={handleAddContribution} className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Contributing to</p>
                <p className="font-semibold">{selectedGoal.name}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Current: ${selectedGoal.currentAmount.toLocaleString()} / ${selectedGoal.targetAmount.toLocaleString()}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Contribution Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="100.00"
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full">Add ${contributionAmount || '0.00'}</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
