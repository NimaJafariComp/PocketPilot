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
import { Filter, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 20;

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
          (decimalSearch
            ? false
            : integerPart.startsWith(amountDigitsFilter)));

      const transactionDate = getDateKey(t.date);
      const matchesDate =
        dateFilterType === 'all' ||
        (dateFilterType === 'specific' && specificDate !== '' && transactionDate === specificDate) ||
        (dateFilterType === 'range' &&
          (fromDate === '' || transactionDate >= fromDate) &&
          (toDate === '' || transactionDate <= toDate));

      return matchesMerchant && matchesCategory && matchesAmount && matchesDate;
    });
  }, [
    transactions,
    merchantFilter,
    categoryFilter,
    amountFilter,
    dateFilterType,
    specificDate,
    fromDate,
    toDate,
  ]);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [merchantFilter, categoryFilter, amountFilter, dateFilterType, specificDate, fromDate, toDate]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const uncategorizedTransactions = transactions.filter((t) => t.category === 'Uncategorized');

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
      toast.success('Transaction updated successfully');
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Transactions</h1>
          <p className="text-gray-500 mt-1">{filteredTransactions.length} transactions</p>
        </div>
        {uncategorizedTransactions.length > 0 && (
          <Badge variant="secondary" className="w-fit">
            {uncategorizedTransactions.length} Uncategorized
          </Badge>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="mb-2 block">Merchant</Label>
              <Input
                placeholder="Search merchant..."
                value={merchantFilter}
                onChange={(e) => setMerchantFilter(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-2 block">Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
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
            <div>
              <Label className="mb-2 block">Amount (optional)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 25.50"
                value={amountFilter}
                onChange={(e) => setAmountFilter(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-2 block">Date Filter</Label>
              <Select
                value={dateFilterType}
                onValueChange={(value: 'all' | 'specific' | 'range') => setDateFilterType(value)}
              >
                <SelectTrigger>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <Label className="mb-2 block">Specific Date</Label>
                <Input type="date" value={specificDate} onChange={(e) => setSpecificDate(e.target.value)} />
              </div>
            </div>
          )}
          {dateFilterType === 'range' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <Label className="mb-2 block">From Date</Label>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div>
                <Label className="mb-2 block">To Date</Label>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={resetFilters}>Clear Filters</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {paginatedTransactions.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.map((transaction) => (
                    <TableRow
                      key={transaction.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleOpenDetail(transaction)}
                    >
                      <TableCell>{format(parseISO(transaction.date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="font-medium">{transaction.merchant}</TableCell>
                      <TableCell>
                        <Badge variant={transaction.category === 'Uncategorized' ? 'outline' : 'secondary'}>
                          {transaction.category}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {transaction.amount < 0 ? '-' : '+'}${Math.abs(transaction.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(transaction);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="text-sm text-gray-500">Page {currentPage} of {totalPages}</div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400">No transactions found</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {editedTransaction && (
            <>
              <SheetHeader>
                <SheetTitle>Edit Transaction</SheetTitle>
              </SheetHeader>
              <div className="space-y-6 mt-6">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={editedTransaction.date.split('T')[0]}
                    onChange={(e) => setEditedTransaction({
                      ...editedTransaction,
                      date: new Date(e.target.value).toISOString(),
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Merchant</Label>
                  <Input
                    value={editedTransaction.merchant}
                    onChange={(e) => setEditedTransaction({
                      ...editedTransaction,
                      merchant: e.target.value,
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editedTransaction.amount}
                    onChange={(e) => setEditedTransaction({
                      ...editedTransaction,
                      amount: parseFloat(e.target.value),
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={editedTransaction.category}
                    onValueChange={(value) => setEditedTransaction({
                      ...editedTransaction,
                      category: value,
                    })}
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

                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    value={editedTransaction.notes || ''}
                    onChange={(e) => setEditedTransaction({
                      ...editedTransaction,
                      notes: e.target.value,
                    })}
                    placeholder="Add notes..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={handleSave} className="flex-1">Save Changes</Button>
                  <Button variant="destructive" size="icon" onClick={() => setShowDeleteDialog(true)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
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
