import { useEffect, useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Transaction } from '../types';
import { services } from '../lib/services';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Filter, Edit2, Trash2, ChevronLeft, ChevronRight, TrendingDown, TrendingUp, X, Plus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 20;

const CATEGORY_COLORS: Record<string, string> = {
  Food: 'bg-orange-100 text-orange-700 border-orange-200',
  Groceries: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Dining: 'bg-orange-100 text-orange-700 border-orange-200',
  Transport: 'bg-blue-100 text-blue-700 border-blue-200',
  Transportation: 'bg-blue-100 text-blue-700 border-blue-200',
  Entertainment: 'bg-purple-100 text-purple-700 border-purple-200',
  Shopping: 'bg-pink-100 text-pink-700 border-pink-200',
  Health: 'bg-green-100 text-green-700 border-green-200',
  Income: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Utilities: 'bg-sky-100 text-sky-700 border-sky-200',
  Bills: 'bg-red-100 text-red-700 border-red-200',
  Uncategorized: 'bg-gray-100 text-gray-500 border-gray-200',
};

function CategoryBadge({ category }: { category: string }) {
  const colors = CATEGORY_COLORS[category] ?? 'bg-secondary text-secondary-foreground border-border';
  return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors}`}>
      {category}
    </span>
  );
}

function CategorizationStatusBadge({ transaction }: { transaction: Transaction }) {
  if (transaction.categoryNeedsReview) {
    return (
      <Badge variant="secondary" className="bg-amber-50 text-amber-800 border-amber-200">
        Needs Review
      </Badge>
    );
  }

  if (transaction.categorySource?.startsWith('auto-')) {
    return (
      <Badge variant="secondary" className="bg-sky-50 text-sky-800 border-sky-200">
        Auto-Categorized
      </Badge>
    );
  }

  return null;
}

export function Transactions() {
  const { transactions, categories, addTransaction, updateTransaction, deleteTransaction } = useData();
  const [merchantFilter, setMerchantFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [amountFilter, setAmountFilter] = useState('');
  const [dateFilterType, setDateFilterType] = useState<'all' | 'specific' | 'range'>('all');
  const [specificDate, setSpecificDate] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [editedTransaction, setEditedTransaction] = useState<Transaction | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreatingTransaction, setIsCreatingTransaction] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    date: new Date().toISOString().split('T')[0],
    merchant: '',
    amount: '',
    type: 'expense' as 'expense' | 'income',
    category: 'Uncategorized',
    notes: '',
  });

  const getDateKey = (isoDate: string) => isoDate.split('T')[0];

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesMerchant =
          merchantFilter.trim() === '' ||
          t.merchant.toLowerCase().includes(merchantFilter.trim().toLowerCase());

      const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;

      const amountInput = amountFilter.trim();
      const amountAsFixed = Math.abs(t.amount).toFixed(2);
      const amountDigitsFilter = amountInput.replace(/\D/g, '');
      const [integerPart, decimalPart = ''] = amountAsFixed.split('.');
      const normalizedAmountInput = amountInput.replace(/[^0-9.]/g, '');
      const decimalSearch = normalizedAmountInput.includes('.');
      const decimalQuery = decimalSearch ? (normalizedAmountInput.split('.')[1] || '').replace(/\D/g, '') : '';
      const matchesAmount =
          amountInput === '' ||
          (decimalSearch && decimalQuery !== '' && decimalPart.startsWith(decimalQuery)) ||
          (amountDigitsFilter !== '' &&
              (decimalSearch ? false : integerPart.startsWith(amountDigitsFilter)));

      const transactionDate = getDateKey(t.date);
      const matchesDate =
          dateFilterType === 'all' ||
          (dateFilterType === 'specific' && specificDate !== '' && transactionDate === specificDate) ||
          (dateFilterType === 'range' &&
              (fromDate === '' || transactionDate >= fromDate) &&
              (toDate === '' || transactionDate <= toDate));

      return matchesMerchant && matchesCategory && matchesAmount && matchesDate;
    });
  }, [transactions, merchantFilter, categoryFilter, amountFilter, dateFilterType, specificDate, fromDate, toDate]);

  // Summary stats from filtered transactions
  const stats = useMemo(() => {
    const spent = filteredTransactions
        .filter((t) => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const income = filteredTransactions
        .filter((t) => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);
    return { spent, income };
  }, [filteredTransactions]);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = filteredTransactions.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [merchantFilter, categoryFilter, amountFilter, dateFilterType, specificDate, fromDate, toDate]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const uncategorizedCount = transactions.filter((t) => t.category === 'Uncategorized').length;

  const hasActiveFilters =
      merchantFilter !== '' ||
      categoryFilter !== 'all' ||
      amountFilter !== '' ||
      dateFilterType !== 'all';

  const handleOpenDetail = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setEditedTransaction({ ...transaction });
  };

  const resetNewTransaction = () => {
    setNewTransaction({
      date: new Date().toISOString().split('T')[0],
      merchant: '',
      amount: '',
      type: 'expense',
      category: 'Uncategorized',
      notes: '',
    });
  };

  const handleCreate = async () => {
    if (isCreatingTransaction) {
      return;
    }

    const merchant = newTransaction.merchant.trim();
    const parsedAmount = parseFloat(newTransaction.amount);

    if (!merchant) {
      toast.error('Merchant is required');
      return;
    }

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Enter a valid amount greater than 0');
      return;
    }

    try {
      setIsCreatingTransaction(true);
      await addTransaction({
        date: new Date(newTransaction.date).toISOString(),
        merchant,
        amount: newTransaction.type === 'expense' ? -parsedAmount : parsedAmount,
        category: newTransaction.category,
        notes: newTransaction.notes.trim(),
      });
      setIsCreateDialogOpen(false);
      resetNewTransaction();
      toast.success('Transaction added');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add transaction');
    } finally {
      setIsCreatingTransaction(false);
    }
  };

  const handleSave = async () => {
    if (!editedTransaction) return;
    try {
      let transactionToSave = { ...editedTransaction };

      if (transactionToSave.category === 'Uncategorized') {
        const [result] = await services.categorization.categorizeTransactions({
          transactions: [
            {
              merchant: transactionToSave.merchant,
              amount: transactionToSave.amount,
              notes: transactionToSave.notes || '',
            },
          ],
          categories: categories.map((category) => category.name),
        });

        if (result) {
          transactionToSave = {
            ...transactionToSave,
            category: result.category,
            categorySource: result.categorySource,
            categoryConfidence: result.categoryConfidence,
            categoryNeedsReview: result.categoryNeedsReview,
            normalizedMerchant: result.normalizedMerchant,
          };
        }
      } else if (selectedTransaction && transactionToSave.category !== selectedTransaction.category) {
        transactionToSave = {
          ...transactionToSave,
          categorySource: 'manual',
          categoryConfidence: 1,
          categoryNeedsReview: false,
        };

        await services.categorization.learnMerchantCategory({
          merchant: transactionToSave.merchant,
          category: transactionToSave.category,
        });
      }

      await updateTransaction(transactionToSave.id, transactionToSave);
      setSelectedTransaction(null);
      setEditedTransaction(null);
      toast.success('Transaction updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update transaction');
    }
  };

  const handleDelete = async () => {
    if (!selectedTransaction) return;
    try {
      await deleteTransaction(selectedTransaction.id);
      setSelectedTransaction(null);
      setEditedTransaction(null);
      setShowDeleteDialog(false);
      toast.success('Transaction deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete transaction');
    }
  };

  const resetFilters = () => {
    setMerchantFilter('');
    setCategoryFilter('all');
    setAmountFilter('');
    setDateFilterType('all');
    setSpecificDate('');
    setFromDate('');
    setToDate('');
  };

  return (
      <div className="p-6 max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {filteredTransactions.length} of {transactions.length} transactions
              {hasActiveFilters && ' (filtered)'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {uncategorizedCount > 0 && (
                <Badge variant="secondary" className="w-fit gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />
                  {uncategorizedCount} need categorization
                </Badge>
            )}
            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (!open) resetNewTransaction();
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Transaction
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>New Transaction</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Date</Label>
                    <Input
                        type="date"
                        value={newTransaction.date}
                        onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select
                        value={newTransaction.type}
                        onValueChange={(value: 'expense' | 'income') => setNewTransaction({ ...newTransaction, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Merchant</Label>
                    <Input
                        placeholder="e.g. Whole Foods"
                        value={newTransaction.merchant}
                        onChange={(e) => setNewTransaction({ ...newTransaction, merchant: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Amount</Label>
                    <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={newTransaction.amount}
                        onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Select
                        value={newTransaction.category}
                        onValueChange={(value) => setNewTransaction({ ...newTransaction, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Notes</Label>
                    <Textarea
                        value={newTransaction.notes}
                        onChange={(e) => setNewTransaction({ ...newTransaction, notes: e.target.value })}
                        placeholder="Location, time, receipt details, or any context"
                        rows={4}
                        className="resize-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={isCreatingTransaction}>
                    {isCreatingTransaction ? 'Saving...' : 'Save Transaction'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
              <TrendingDown className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Spent</p>
              <p className="text-lg font-semibold tracking-tight text-red-600">
                ${stats.spent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Income</p>
              <p className="text-lg font-semibold tracking-tight text-green-600">
                ${stats.income.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">Filters</span>
              {hasActiveFilters && (
                  <button
                      onClick={resetFilters}
                      className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Clear all
                  </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Merchant</Label>
                <Input
                    placeholder="Search merchant..."
                    value={merchantFilter}
                    onChange={(e) => setMerchantFilter(e.target.value)}
                    className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Amount</Label>
                <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 25.50"
                    value={amountFilter}
                    onChange={(e) => setAmountFilter(e.target.value)}
                    className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Select
                    value={dateFilterType}
                    onValueChange={(value: 'all' | 'specific' | 'range') => setDateFilterType(value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="specific">Specific Date</SelectItem>
                    <SelectItem value="range">Date Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {dateFilterType === 'specific' && (
                <div className="mt-3 max-w-xs">
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Specific Date</Label>
                  <Input type="date" value={specificDate} onChange={(e) => setSpecificDate(e.target.value)} className="h-9" />
                </div>
            )}
            {dateFilterType === 'range' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 max-w-md">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">From</Label>
                    <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">To</Label>
                    <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9" />
                  </div>
                </div>
            )}
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {paginatedTransactions.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pl-5">Date</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Merchant</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right pr-5">Amount</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTransactions.map((transaction) => (
                          <TableRow
                              key={transaction.id}
                              className="cursor-pointer hover:bg-muted/40 transition-colors group"
                              onClick={() => handleOpenDetail(transaction)}
                          >
                            <TableCell className="text-sm text-muted-foreground pl-5 py-3.5">
                              {format(parseISO(transaction.date), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell className="py-3.5">
                              <div className="space-y-1">
                                <p className="font-medium text-sm">{transaction.merchant}</p>
                                <CategorizationStatusBadge transaction={transaction} />
                              </div>
                            </TableCell>
                            <TableCell className="py-3.5">
                              <CategoryBadge category={transaction.category} />
                            </TableCell>
                            <TableCell className={`text-right font-semibold text-sm pr-5 py-3.5 ${transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {transaction.amount < 0 ? '−' : '+'}${Math.abs(transaction.amount).toFixed(2)}
                            </TableCell>
                            <TableCell className="py-3.5 pr-3">
                              <Button
                                  variant="ghost"
                                  size="icon"
                                  className="w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenDetail(transaction);
                                  }}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {totalPages > 1 && (
                      <div className="flex items-center justify-between px-5 py-3.5 border-t border-border">
                        <p className="text-xs text-muted-foreground">
                          Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)} of {filteredTransactions.length}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2.5 text-xs gap-1"
                              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                              disabled={currentPage === 1}
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            Prev
                          </Button>
                          <span className="text-xs text-muted-foreground px-1">{currentPage} / {totalPages}</span>
                          <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2.5 text-xs gap-1"
                              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                              disabled={currentPage === totalPages}
                          >
                            Next
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                  )}
                </>
            ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">No transactions found</p>
                  <p className="text-xs text-muted-foreground mb-4">Try adjusting your filters</p>
                  {hasActiveFilters && (
                      <Button variant="outline" size="sm" onClick={resetFilters}>Clear Filters</Button>
                  )}
                </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Sheet */}
        <Sheet open={!!selectedTransaction} onOpenChange={() => {
          setSelectedTransaction(null);
          setEditedTransaction(null);
        }}>
          <SheetContent className="w-full sm:max-w-lg lg:max-w-xl overflow-y-auto p-0">
            {editedTransaction && (
                <>
                  <div className="flex h-full flex-col">
                    <SheetHeader className="border-b pr-14 pb-4">
                      <SheetTitle>Edit Transaction</SheetTitle>
                      <p className="text-sm text-muted-foreground">{editedTransaction.merchant}</p>
                      <div className="pt-1">
                        <CategorizationStatusBadge transaction={editedTransaction} />
                      </div>
                    </SheetHeader>

                    <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
                      <div className={`rounded-2xl border px-5 py-4 text-center ${editedTransaction.amount < 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                        <p className={`text-2xl font-bold tracking-tight ${editedTransaction.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {editedTransaction.amount < 0 ? '−' : '+'}${Math.abs(editedTransaction.amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(parseISO(editedTransaction.date), 'MMMM dd, yyyy')}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Date</Label>
                          <Input
                              type="date"
                              value={editedTransaction.date.split('T')[0]}
                              onChange={(e) => setEditedTransaction({
                                ...editedTransaction,
                                date: new Date(e.target.value).toISOString(),
                              })}
                              className="h-10"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Amount</Label>
                          <Input
                              type="number"
                              step="0.01"
                              value={editedTransaction.amount}
                              onChange={(e) => setEditedTransaction({ ...editedTransaction, amount: parseFloat(e.target.value) })}
                              className="h-10"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Merchant</Label>
                        <Input
                            value={editedTransaction.merchant}
                            onChange={(e) => setEditedTransaction({ ...editedTransaction, merchant: e.target.value })}
                            className="h-10"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Category</Label>
                        <Select
                            value={editedTransaction.category}
                            onValueChange={(value) => setEditedTransaction({ ...editedTransaction, category: value })}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Notes</Label>
                        <Textarea
                            value={editedTransaction.notes || ''}
                            onChange={(e) => setEditedTransaction({ ...editedTransaction, notes: e.target.value })}
                            placeholder="Add a note..."
                            rows={5}
                            className="min-h-28 resize-none text-sm"
                        />
                      </div>
                    </div>

                    <div className="border-t px-5 py-4 sm:px-6">
                      <div className="flex gap-2">
                        <Button onClick={handleSave} className="flex-1 h-10">Save Changes</Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                            onClick={() => setShowDeleteDialog(true)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
            )}
          </SheetContent>
        </Sheet>

        {/* Delete Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{selectedTransaction?.merchant}</strong>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  );
}
