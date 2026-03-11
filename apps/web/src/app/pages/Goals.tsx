import { useState } from 'react';
import { useData } from '../context/DataContext';
import { Goal, Contribution } from '../types';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Plus, TrendingUp, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const CHART_COLORS = [
  'oklch(0.6 0.118 184.704)',
  'oklch(0.769 0.188 70.08)',
  'oklch(0.398 0.07 227.392)',
  'oklch(0.646 0.222 41.116)',
  'oklch(0.828 0.189 84.429)',
];

const COMPLETE_COLOR = 'oklch(0.55 0.12 150)';

export function Goals() {
  const { goals, addGoal, updateGoal } = useData();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isContributeDialogOpen, setIsContributeDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState({ name: '', targetAmount: '', deadline: '' });
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
      toast.success('Contribution added');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add contribution');
    }
  };

  const openContributeDialog = (goal: Goal) => {
    setSelectedGoal(goal);
    setIsContributeDialogOpen(true);
  };

  const getChartData = (goal: Goal) => {
    if (goal.contributions.length === 0) return [];
    const sorted = [...goal.contributions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    let running = 0;
    return sorted.map((c) => {
      running += c.amount;
      return { date: format(parseISO(c.date), 'MMM d'), amount: running };
    });
  };

  // ── Summary totals ──
  const totalSaved    = goals.reduce((s, g) => s + g.currentAmount, 0);
  const totalNeeded   = goals.reduce((s, g) => s + Math.max(0, g.targetAmount - g.currentAmount), 0);
  const completedCount = goals.filter(g => g.currentAmount >= g.targetAmount).length;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Savings Goals</h1>
          <p className="text-muted-foreground mt-1 text-sm">Track your progress toward financial goals</p>
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
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
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
                  onChange={e => setFormData({ ...formData, targetAmount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Deadline{' '}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  type="date"
                  value={formData.deadline}
                  onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-[2]">Create Goal</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Summary strip ── */}
      {goals.length > 0 && (
        <div className="grid grid-cols-3 divide-x divide-border border border-border rounded-lg overflow-hidden">
          <div className="px-6 py-5 relative">
            <div className="absolute left-0 top-[20%] bottom-[20%] w-0.5 bg-primary rounded-r" />
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1.5">Total Saved</p>
            <p className="text-2xl font-bold tracking-tight">${totalSaved.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">across {goals.length} goal{goals.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="px-6 py-5">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1.5">Still Needed</p>
            <p className="text-2xl font-bold tracking-tight">${totalNeeded.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">to reach all targets</p>
          </div>
          <div className="px-6 py-5">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1.5">Completed</p>
            <p className="text-2xl font-bold tracking-tight">{completedCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">of {goals.length} goal{goals.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}

      {/* ── Goals grid ── */}
      {goals.length > 0 ? (
        <>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">All Goals</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {goals.map((goal, i) => {
              const pct      = (goal.currentAmount / goal.targetAmount) * 100;
              const isComplete = pct >= 100;
              const color    = isComplete ? COMPLETE_COLOR : CHART_COLORS[i % CHART_COLORS.length];
              const chartData = getChartData(goal);
              const remaining = goal.targetAmount - goal.currentAmount;

              return (
                <Card key={goal.id} className="overflow-hidden p-0">
                  {/* colour strip */}
                  <div className="h-0.5" style={{ background: color }} />

                  <CardContent className="p-5 space-y-4">

                    {/* name + badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold tracking-tight">{goal.name}</h3>
                        {goal.deadline ? (
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {isComplete ? 'Completed' : 'Due'} {format(parseISO(goal.deadline), 'MMM d, yyyy')}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-0.5">No deadline set</p>
                        )}
                      </div>
                      <Badge
                        variant={isComplete ? 'default' : 'secondary'}
                        className="shrink-0 text-xs"
                        style={isComplete ? { background: color, color: '#fff' } : {}}
                      >
                        {isComplete ? 'Complete' : `${Math.round(pct)}%`}
                      </Badge>
                    </div>

                    {/* amounts + progress */}
                    <div>
                      <div className="flex items-baseline gap-1.5 mb-2">
                        <span
                          className="text-2xl font-bold tracking-tight"
                          style={isComplete ? { color } : {}}
                        >
                          ${goal.currentAmount.toLocaleString()}
                        </span>
                        <span className="text-sm text-muted-foreground">/ ${goal.targetAmount.toLocaleString()}</span>
                      </div>
                      <Progress
                        value={Math.min(pct, 100)}
                        className="h-1.5 mb-1.5"
                        style={{ '--progress-color': color } as React.CSSProperties}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>$0</span>
                        {isComplete ? (
                          <span style={{ color }} className="font-medium">Goal reached 🎉</span>
                        ) : (
                          <span className="font-medium text-foreground">
                            ${remaining.toLocaleString()} remaining
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Sparkline */}
                    {chartData.length > 1 && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Progress over time
                        </p>
                        <ResponsiveContainer width="100%" height={48}>
                          <LineChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                            <Tooltip
                              formatter={(v) => [`${v}`, 'Saved']}
                              contentStyle={{
                                border: '1px solid rgba(0,0,0,0.1)',
                                borderRadius: '0.5rem',
                                fontSize: '0.75rem',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="amount"
                              stroke={color}
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Contributions */}
                    {goal.contributions.length > 0 && (
                      <div>
                        <div className="border-t pt-3">
                          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
                            Recent Contributions
                          </p>
                          <div className="space-y-0 divide-y divide-border">
                            {[...goal.contributions]
                              .reverse()
                              .slice(0, 3)
                              .map(c => (
                                <div key={c.id} className="flex justify-between py-1.5 text-sm">
                                  <span className="text-muted-foreground">
                                    {format(parseISO(c.date), 'MMM d, yyyy')}
                                  </span>
                                  <span className="font-medium text-emerald-700">
                                    +${c.amount.toFixed(2)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action */}
                    <Button
                      className="w-full"
                      variant={isComplete ? 'outline' : 'default'}
                      disabled={isComplete}
                      onClick={() => openContributeDialog(goal)}
                    >
                      {isComplete ? 'Goal Reached' : '+ Add Contribution'}
                    </Button>

                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground text-sm mb-4">
              Create your first savings goal to start tracking progress
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Goal
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Add Contribution dialog ── */}
      <Dialog open={isContributeDialogOpen} onOpenChange={setIsContributeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contribution</DialogTitle>
          </DialogHeader>
          {selectedGoal && (() => {
            const pct = (selectedGoal.currentAmount / selectedGoal.targetAmount) * 100;
            return (
              <form onSubmit={handleAddContribution} className="space-y-4">
                {/* goal context */}
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <p className="font-medium text-sm">{selectedGoal.name}</p>
                  <Progress value={Math.min(pct, 100)} className="h-1.5" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>${selectedGoal.currentAmount.toLocaleString()} saved</span>
                    <span>{Math.round(pct)}% — ${(selectedGoal.targetAmount - selectedGoal.currentAmount).toLocaleString()} to go</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="100.00"
                    value={contributionAmount}
                    onChange={e => setContributionAmount(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsContributeDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-[2]">
                    Add {contributionAmount ? `$${contributionAmount}` : ''}
                  </Button>
                </div>
              </form>
            );
          })()}
        </DialogContent>
      </Dialog>

    </div>
  );
}