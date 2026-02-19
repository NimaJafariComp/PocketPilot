import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Budget } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Slider } from '../components/ui/slider';
import { Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { toast } from 'sonner';

export function Budgets() {
  const { budgets, transactions, categories, addBudget, updateBudget, deleteBudget } = useData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    month: format(new Date(), 'yyyy-MM'),
    warningThreshold: 80,
    limitThreshold: 100,
  });

  const currentMonth = format(new Date(), 'yyyy-MM');

  const budgetData = useMemo(() => {
    const currentMonthStart = startOfMonth(new Date());
    const currentMonthEnd = endOfMonth(new Date());

    return budgets
      .filter(b => b.month === currentMonth)
      .map(budget => {
        const spent = Math.abs(
          transactions
            .filter(t => {
              const date = parseISO(t.date);
              return (
                t.category === budget.category &&
                t.amount < 0 &&
                date >= currentMonthStart &&
                date <= currentMonthEnd
              );
            })
            .reduce((sum, t) => sum + t.amount, 0)
        );

        const percentage = (spent / budget.amount) * 100;
        const status =
          percentage >= budget.limitThreshold
            ? 'over'
            : percentage >= budget.warningThreshold
            ? 'warning'
            : 'good';

        return { ...budget, spent, percentage, status };
      });
  }, [budgets, transactions, currentMonth]);

  const totalBudget = budgetData.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgetData.reduce((sum, b) => sum + b.spent, 0);
  const totalPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const handleOpenDialog = (budget?: Budget) => {
    if (budget) {
      setEditingBudget(budget);
      setFormData({
        category: budget.category,
        amount: budget.amount.toString(),
        month: budget.month,
        warningThreshold: budget.warningThreshold,
        limitThreshold: budget.limitThreshold,
      });
    } else {
      setEditingBudget(null);
      setFormData({
        category: '',
        amount: '',
        month: format(new Date(), 'yyyy-MM'),
        warningThreshold: 80,
        limitThreshold: 100,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingBudget) {
      updateBudget(editingBudget.id, {
        category: formData.category,
        amount: parseFloat(formData.amount),
        month: formData.month,
        warningThreshold: formData.warningThreshold,
        limitThreshold: formData.limitThreshold,
      });
      toast.success('Budget updated successfully');
    } else {
      addBudget({
        category: formData.category,
        amount: parseFloat(formData.amount),
        month: formData.month,
        warningThreshold: formData.warningThreshold,
        limitThreshold: formData.limitThreshold,
      });
      toast.success('Budget created successfully');
    }
    
    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this budget?')) {
      deleteBudget(id);
      toast.success('Budget deleted');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Budgets</h1>
          <p className="text-gray-500 mt-1">
            Manage your monthly spending limits
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Create Budget
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingBudget ? 'Edit Budget' : 'Create Budget'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter(c => c.name !== 'Uncategorized' && c.name !== 'Income')
                      .map(cat => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Budget Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="500.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Month</Label>
                <Input
                  type="month"
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Warning Threshold: {formData.warningThreshold}%</Label>
                <Slider
                  value={[formData.warningThreshold]}
                  onValueChange={([value]) => setFormData({ ...formData, warningThreshold: value })}
                  min={50}
                  max={100}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <Label>Limit Threshold: {formData.limitThreshold}%</Label>
                <Slider
                  value={[formData.limitThreshold]}
                  onValueChange={([value]) => setFormData({ ...formData, limitThreshold: value })}
                  min={80}
                  max={120}
                  step={5}
                />
              </div>

              <Button type="submit" className="w-full">
                {editingBudget ? 'Update Budget' : 'Create Budget'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overall Budget */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Monthly Budget</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-3xl font-bold">
                ${Math.round(totalSpent).toLocaleString()}
              </div>
              <p className="text-sm text-gray-500">
                of ${totalBudget.toLocaleString()} total budget
              </p>
            </div>
            <Badge
              variant={
                totalPercentage >= 100
                  ? 'destructive'
                  : totalPercentage >= 80
                  ? 'secondary'
                  : 'default'
              }
            >
              {Math.round(totalPercentage)}%
            </Badge>
          </div>
          <Progress value={Math.min(totalPercentage, 100)} />
        </CardContent>
      </Card>

      {/* Category Budgets */}
      <div className="space-y-4">
        {budgetData.length > 0 ? (
          budgetData.map((budget) => (
            <Card key={budget.id}>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{budget.category}</h3>
                        {budget.status === 'over' && (
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                        )}
                        {budget.status === 'warning' && (
                          <AlertTriangle className="w-5 h-5 text-orange-600" />
                        )}
                      </div>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-bold">
                          ${Math.round(budget.spent).toLocaleString()}
                        </span>
                        <span className="text-gray-500">
                          / ${budget.amount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          budget.status === 'over'
                            ? 'destructive'
                            : budget.status === 'warning'
                            ? 'secondary'
                            : 'default'
                        }
                      >
                        {Math.round(budget.percentage)}%
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(budget)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(budget.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <Progress
                    value={Math.min(budget.percentage, 100)}
                    className={
                      budget.status === 'over'
                        ? '[&>div]:bg-red-600'
                        : budget.status === 'warning'
                        ? '[&>div]:bg-orange-500'
                        : ''
                    }
                  />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Warning at {budget.warningThreshold}%</span>
                    <span>Limit at {budget.limitThreshold}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-400 mb-4">No budgets for this month</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Budget
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
