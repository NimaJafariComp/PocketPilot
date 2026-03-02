import { useEffect, useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Transaction } from '../types';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
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
import { Filter, Edit2, Trash2, ChevronLeft, ChevronRight, TrendingDown, TrendingUp, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 20;

const CATEGORY_COLORS: Record<string, string> = {
  Food: 'bg-orange-100 text-orange-700 border-orange-200',
  Groceries: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Transport: 'bg-blue-100 text-blue-700 border-blue-200',
  Entertainment: 'bg-purple-100 text-purple-700 border-purple-200',
  Shopping: 'bg-pink-100 text-pink-700 border-pink-200',
  Health: 'bg-green-100 text-green-700 border-green-200',
  Income: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Utilities: 'bg-sky-100 text-sky-700 border-sky-200',
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

export function Transactions() {
  const { transactions, categories, updateTransaction, deleteTransaction } = useData();
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

  const handleSave = async () => {
    if (!editedTransaction) return;
    try {
      await updateTransaction(editedTransaction.id, editedTransaction);
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
          {uncategorizedCount > 0 && (
              <Badge variant="secondary" className="w-fit gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />
                {uncategorizedCount} need categorization
              </Badge>
          )}
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
                            <TableCell className="font-medium text-sm py-3.5">
                              {transaction.merchant}
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
        <Sheet open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            {editedTransaction && (
                <>
                  <SheetHeader className="pb-2">
                    <SheetTitle>Edit Transaction</SheetTitle>
                    <p className="text-sm text-muted-foreground">{editedTransaction.merchant}</p>
                  </SheetHeader>

                  {/* Amount display at top of sheet */}
                  <div className={`my-4 px-4 py-3 rounded-xl border text-center ${editedTransaction.amount < 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                    <p className={`text-2xl font-bold tracking-tight ${editedTransaction.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {editedTransaction.amount < 0 ? '−' : '+'}${Math.abs(editedTransaction.amount).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(parseISO(editedTransaction.date), 'MMMM dd, yyyy')}
                    </p>
                  </div>

                  <div className="space-y-4 mt-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Date</Label>
                      <Input
                          type="date"
                          value={editedTransaction.date.split('T')[0]}
                          onChange={(e) => setEditedTransaction({
                            ...editedTransaction,
                            date: new Date(e.target.value).toISOString(),
                          })}
                          className="h-9"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Merchant</Label>
                      <Input
                          value={editedTransaction.merchant}
                          onChange={(e) => setEditedTransaction({ ...editedTransaction, merchant: e.target.value })}
                          className="h-9"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Amount</Label>
                      <Input
                          type="number"
                          step="0.01"
                          value={editedTransaction.amount}
                          onChange={(e) => setEditedTransaction({ ...editedTransaction, amount: parseFloat(e.target.value) })}
                          className="h-9"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Category</Label>
                      <Select
                          value={editedTransaction.category}
                          onValueChange={(value) => setEditedTransaction({ ...editedTransaction, category: value })}
                      >
                        <SelectTrigger className="h-9">
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
                          rows={3}
                          className="resize-none text-sm"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleSave} className="flex-1">Save Changes</Button>
                      <Button
                          variant="outline"
                          size="icon"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                          onClick={() => setShowDeleteDialog(true)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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