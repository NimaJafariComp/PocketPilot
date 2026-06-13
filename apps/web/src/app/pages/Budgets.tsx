import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import { AlertTriangle, Edit2, Info, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Progress } from "../components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Slider } from "../components/ui/slider";
import { useData } from "../context/DataContext";
import { services } from "../lib/services";
import type { Budget } from "../types";

type BudgetStatus = "over" | "warning" | "good";

interface BudgetWithStats extends Budget {
  spent: number;
  percentage: number;
  status: BudgetStatus;
  remaining: number;
}

const STATUS_ORDER: Record<BudgetStatus, number> = { over: 0, warning: 1, good: 2 };

export function Budgets() {
  const { budgets, transactions, categories, addBudget, updateBudget, deleteBudget } = useData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [formData, setFormData] = useState({
    category: "",
    amount: "",
    month: format(new Date(), "yyyy-MM"),
    warningThreshold: 80,
    limitThreshold: 100,
  });

  const currentMonth = format(new Date(), "yyyy-MM");

  const budgetData = useMemo((): BudgetWithStats[] => {
    const currentMonthStart = startOfMonth(new Date());
    const currentMonthEnd = endOfMonth(new Date());

    return budgets
      .filter((b) => b.month === currentMonth)
      .map((budget) => {
        const spent = Math.abs(
          transactions
            .filter((t) => {
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
        const status: BudgetStatus =
          percentage >= budget.limitThreshold
            ? "over"
            : percentage >= budget.warningThreshold
              ? "warning"
              : "good";
        const remaining = budget.amount - spent;

        return { ...budget, spent, percentage, status, remaining };
      })
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  }, [budgets, transactions, currentMonth]);

  // ── Overview totals ──
  const totalBudget = budgetData.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgetData.reduce((s, b) => s + b.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const totalPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const overCount = budgetData.filter((b) => b.status === "over").length;
  const warningCount = budgetData.filter((b) => b.status === "warning").length;
  const goodCount = budgetData.filter((b) => b.status === "good").length;

  // ── Alerts ──
  const alertBudgets = budgetData.filter((b) => b.status === "over" || b.status === "warning");

  // ── Dialog helpers ──
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
        category: "",
        amount: "",
        month: format(new Date(), "yyyy-MM"),
        warningThreshold: 80,
        limitThreshold: 100,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(formData.amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Enter a budget amount greater than 0");
      return;
    }

    try {
      if (editingBudget) {
        await updateBudget(editingBudget.id, {
          category: formData.category,
          amount: parsedAmount,
          month: formData.month,
          warningThreshold: formData.warningThreshold,
          limitThreshold: formData.limitThreshold,
        });
        toast.success("Budget updated successfully");
      } else {
        await addBudget({
          category: formData.category,
          amount: parsedAmount,
          month: formData.month,
          warningThreshold: formData.warningThreshold,
          limitThreshold: formData.limitThreshold,
        });
        toast.success("Budget created successfully");
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save budget");
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await services.dialog.confirm("Are you sure you want to delete this budget?");
    if (confirmed) {
      try {
        await deleteBudget(id);
        toast.success("Budget deleted");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to delete budget");
      }
    }
  };

  // ── Badge helpers ──
  const statusBadgeVariant = (status: BudgetStatus) =>
    status === "over" ? "destructive" : "outline";

  const statusBadgeClass = (status: BudgetStatus) =>
    status === "warning"
      ? "border-warning/25 bg-warning/12 text-warning-foreground"
      : status === "good"
        ? "border-success/25 bg-success/10 text-success"
        : "";

  const statusLabel = (status: BudgetStatus) =>
    status === "over" ? "Over limit" : status === "warning" ? "Warning" : "On track";

  const progressClass = (status: BudgetStatus) =>
    status === "over" ? "[&>div]:bg-destructive" : status === "warning" ? "[&>div]:bg-warning" : "";

  // ── Dollar helpers for dialog sliders ──
  const parsedBudgetAmount = parseFloat(formData.amount);
  const isBudgetAmountValid = Number.isFinite(parsedBudgetAmount) && parsedBudgetAmount > 0;
  const isBudgetFormValid =
    Boolean(formData.category) && Boolean(formData.month) && isBudgetAmountValid;
  const budgetAmount = isBudgetAmountValid ? parsedBudgetAmount : 0;
  const warnDollars =
    budgetAmount > 0 ? Math.round((budgetAmount * formData.warningThreshold) / 100) : null;
  const limitDollars =
    budgetAmount > 0 ? Math.round((budgetAmount * formData.limitThreshold) / 100) : null;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Budgets</h1>
          <p className="text-muted-foreground mt-1 text-sm">{format(new Date(), "MMMM yyyy")}</p>
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
              <DialogTitle>{editingBudget ? "Edit Budget" : "Create Budget"}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter((c) => c.name !== "Uncategorized" && c.name !== "Income")
                      .map((cat) => (
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
                  min="0.01"
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

              {/* Warning threshold with dollar context */}
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <Label>Warning Threshold</Label>
                  <span className="text-sm text-muted-foreground">
                    {formData.warningThreshold}%
                  </span>
                </div>
                {warnDollars !== null && (
                  <p className="text-base font-semibold -mt-1">
                    Warn me at ${warnDollars.toLocaleString()}
                  </p>
                )}
                <Slider
                  value={[formData.warningThreshold]}
                  onValueChange={([v]) => setFormData({ ...formData, warningThreshold: v })}
                  min={50}
                  max={100}
                  step={5}
                />
              </div>

              {/* Limit threshold with dollar context */}
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <Label>Limit Threshold</Label>
                  <span className="text-sm text-muted-foreground">{formData.limitThreshold}%</span>
                </div>
                {limitDollars !== null && (
                  <p className="text-base font-semibold -mt-1">
                    Stop me at ${limitDollars.toLocaleString()}
                  </p>
                )}
                <Slider
                  value={[formData.limitThreshold]}
                  onValueChange={([v]) => setFormData({ ...formData, limitThreshold: v })}
                  min={80}
                  max={120}
                  step={5}
                />
              </div>

              <Button type="submit" className="w-full" disabled={!isBudgetFormValid}>
                {editingBudget ? "Update Budget" : "Create Budget"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Overview hero ── */}
      {budgetData.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-6 items-start">
              {/* Left: big spent number + progress */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
                  Total spent this month
                </p>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-bold tracking-tight">
                    ${Math.round(totalSpent).toLocaleString()}
                  </span>
                  <span className="text-muted-foreground text-base">
                    / ${totalBudget.toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  <span className="text-foreground font-medium">
                    ${Math.max(0, Math.round(totalRemaining)).toLocaleString()}
                  </span>{" "}
                  still available across all budgets
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span>{Math.round(totalPct)}% used</span>
                    <span>100%</span>
                  </div>
                  <Progress value={Math.min(totalPct, 100)} className="h-2" />
                </div>
              </div>

              {/* Right: status mini-stats */}
              <div className="flex flex-col gap-4 pl-6 border-l shrink-0">
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-0.5">
                    Over limit
                  </p>
                  <p
                    className={`text-2xl font-bold tracking-tight ${overCount > 0 ? "text-destructive" : ""}`}
                  >
                    {overCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-0.5">
                    Warning
                  </p>
                  <p className="text-2xl font-bold tracking-tight">{warningCount}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-0.5">
                    On track
                  </p>
                  <p className="text-2xl font-bold tracking-tight">{goodCount}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Alerts strip ── */}
      {alertBudgets.length > 0 && (
        <div className="space-y-2">
          {alertBudgets.map((budget) => (
            <div
              key={budget.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm ${
                budget.status === "over"
                  ? "bg-destructive/5 border-destructive/20 text-destructive"
                  : "border-warning/25 bg-warning/12 text-warning-foreground"
              }`}
            >
              {budget.status === "over" ? (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              ) : (
                <Info className="w-4 h-4 shrink-0" />
              )}
              <span className="flex-1">
                {budget.status === "over" ? (
                  <>
                    <strong>{budget.category}</strong> is $
                    {Math.round(Math.abs(budget.remaining)).toLocaleString()} over its $
                    {budget.amount.toLocaleString()} limit.
                  </>
                ) : (
                  <>
                    <strong>{budget.category}</strong> is at {Math.round(budget.percentage)}% — only
                    ${Math.round(budget.remaining).toLocaleString()} left.
                  </>
                )}
              </span>
              <button
                type="button"
                className="text-xs font-medium underline underline-offset-2 opacity-70 hover:opacity-100 shrink-0"
                onClick={() => handleOpenDialog(budget)}
              >
                {budget.status === "over" ? "Adjust budget" : "View"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Budget cards ── */}
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
          All Categories
        </p>

        <div className="space-y-2">
          {budgetData.length > 0 ? (
            budgetData.map((budget) => (
              <Card
                key={budget.id}
                className={budget.status === "over" ? "border-destructive/30" : ""}
              >
                <CardContent className="pt-0 pb-0">
                  {/* Coloured top strip */}
                  <div
                    className="h-0.5 -mx-6 mb-5 mt-0 rounded-t-lg"
                    style={{
                      background:
                        budget.status === "over"
                          ? "var(--destructive)"
                          : budget.status === "warning"
                            ? "var(--chart-5)"
                            : "var(--chart-2)",
                    }}
                  />

                  <div className="flex gap-4 items-center pb-5">
                    {/* Left: name + progress */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            background:
                              budget.status === "over"
                                ? "var(--destructive)"
                                : budget.status === "warning"
                                  ? "var(--chart-5)"
                                  : "var(--chart-2)",
                          }}
                        />
                        <span className="font-medium text-sm">{budget.category}</span>
                        <Badge
                          variant={statusBadgeVariant(budget.status)}
                          className={`py-0 text-xs ${statusBadgeClass(budget.status)}`}
                        >
                          {statusLabel(budget.status)}
                        </Badge>
                      </div>

                      <Progress
                        value={Math.min(budget.percentage, 100)}
                        className={`h-2 mb-1.5 ${progressClass(budget.status)}`}
                      />

                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>$0</span>
                        <span>
                          {budget.status === "over"
                            ? `${Math.round(Math.abs(budget.remaining)).toLocaleString()} over ${budget.amount.toLocaleString()} budget`
                            : `${Math.round(budget.spent).toLocaleString()} of ${budget.amount.toLocaleString()}`}
                        </span>
                      </div>
                    </div>

                    {/* Right: remaining — the hero number */}
                    <div className="pl-4 border-l text-right flex flex-col items-end gap-1 shrink-0 min-w-[96px]">
                      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                        {budget.status === "over" ? "Over by" : "Remaining"}
                      </p>
                      <p
                        className={`text-2xl font-bold tracking-tight leading-none ${budget.status === "over" ? "text-destructive" : ""}`}
                      >
                        ${Math.round(Math.abs(budget.remaining)).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        spent ${Math.round(budget.spent).toLocaleString()}
                      </p>
                      <div className="flex gap-1 mt-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleOpenDialog(budget)}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleDelete(budget.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">No budgets for this month</p>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Budget
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
