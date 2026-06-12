import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  detectCsvTransactionColumns,
  parseCsvTransactionRow,
  parseDateOnly,
  resolveCsvAmount,
} from '@pocketpilot/core';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useData } from '../context/DataContext';
import Papa from 'papaparse';
import { format, parseISO } from 'date-fns';
import { services } from '../lib/services';

type ImportStep = 'upload' | 'mapping' | 'preview' | 'success';
const NO_CATEGORY_VALUE = '__none__';

interface ParsedRow {
  [key: string]: string;
}

export function ImportCSV() {
  const navigate = useNavigate();
  const { importTransactions } = useData();
  const [step, setStep] = useState<ImportStep>('upload');
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState({
    date: '',
    merchant: '',
    amount: '',
    debit: '',
    credit: '',
    category: '',
    notes: '',
    account: '',
  });
  const [accountLabel, setAccountLabel] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [skippedDuplicates, setSkippedDuplicates] = useState(0);
  const [invertAmounts, setInvertAmounts] = useState(false);

  const parseCsvFile = useCallback((file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setErrors(results.errors.slice(0, 10).map((error) => `Row ${error.row ?? '?'}: ${error.message}`));
          return;
        }

        if (results.data.length === 0) {
          setErrors(['The CSV file is empty']);
          return;
        }
        
        const data = results.data as ParsedRow[];
        const cols = Object.keys(data[0]);
        
        setHeaders(cols);
        setParsedData(data);
        setStep('mapping');
        setErrors([]);

        const detectedMapping = detectCsvTransactionColumns(cols);
        
        setMapping({
          date: detectedMapping.date,
          merchant: detectedMapping.merchant,
          amount: detectedMapping.amount || '',
          debit: detectedMapping.debit || '',
          credit: detectedMapping.credit || '',
          category: detectedMapping.category || '',
          notes: detectedMapping.notes || '',
          account: detectedMapping.account || '',
        });
        setAccountLabel((current) => current || file.name.replace(/\.[^.]+$/, ''));
      },
      error: (error) => {
        setErrors([`Failed to parse CSV: ${error.message}`]);
      },
    });
  }, []);

  const handleChooseFile = async () => {
    const pickedFile = await services.fileImport.pickCsvFile();
    if (!pickedFile) return;
    const csvText = await pickedFile.text();
    const file = new File([csvText], pickedFile.name, { type: 'text/csv' });
    parseCsvFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file?.type === 'text/csv' || file?.name.endsWith('.csv')) {
      parseCsvFile(file);
    }
  };

  const validateMapping = () => {
    const newErrors: string[] = [];
    if (!mapping.date) newErrors.push('Date column is required');
    if (!mapping.merchant) newErrors.push('Merchant column is required');
    if (!mapping.amount && !mapping.debit && !mapping.credit) {
      newErrors.push('Amount column or debit/credit columns are required');
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handlePreview = () => {
    if (!validateMapping()) return;
    setStep('preview');
  };

  const parseMappedAmount = (row: ParsedRow) => {
    return resolveCsvAmount(row, mapping, { invertAmounts });
  };

  const handleImport = async () => {
    const importErrors: string[] = [];

    const fallbackAccount = accountLabel.trim();
    const transactions = parsedData.map((row, index) => {
      const result = parseCsvTransactionRow(row, mapping, index + 1, { invertAmounts, fallbackAccount });
      importErrors.push(...result.errors);
      return result.transaction;
    });

    if (importErrors.length > 0) {
      setErrors(importErrors.slice(0, 10));
      return;
    }

    const result = await importTransactions(transactions);
    setImportedCount(result.imported);
    setSkippedDuplicates(result.skippedDuplicates);
    setErrors([]);
    setStep('success');
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {['Upload', 'Map Columns', 'Preview', 'Complete'].map((label, idx) => {
            const stepValues: ImportStep[] = ['upload', 'mapping', 'preview', 'success'];
            const currentIdx = stepValues.indexOf(step);
            const isActive = idx <= currentIdx;
            
            return (
              <div key={label} className="flex-1 flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'border border-border bg-muted text-muted-foreground'
                }`}>
                  {idx < currentIdx ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                </div>
                <div className={`flex-1 h-1 ${idx < 3 ? (isActive ? 'bg-primary' : 'bg-border') : ''}`} />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span className={step === 'upload' ? 'text-foreground' : ''}>Upload</span>
          <span className={step === 'mapping' ? 'text-foreground' : ''}>Map Columns</span>
          <span className={step === 'preview' ? 'text-foreground' : ''}>Preview</span>
          <span className={step === 'success' ? 'text-foreground' : ''}>Complete</span>
        </div>
      </div>

      {errors.length > 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            <ul className="list-disc list-inside">
              {errors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Step */}
      {step === 'upload' && (
        <Card>
          <CardContent className="pt-6">
            <div
              className="cursor-pointer rounded-lg border-2 border-dashed border-border bg-muted/20 p-12 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={handleChooseFile}
            >
              <FileSpreadsheet className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Upload CSV File</h3>
              <p className="mb-4 text-muted-foreground">
                Drag and drop your CSV file here, or click to browse
              </p>
              <Button type="button">
                <Upload className="w-4 h-4 mr-2" />
                Choose File
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mapping Step */}
      {step === 'mapping' && (
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Map CSV Columns</h3>
              <p className="mb-6 text-muted-foreground">
                Match your CSV columns to the required fields
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date Column *</Label>
                <Select value={mapping.date} onValueChange={(v) => setMapping({ ...mapping, date: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select date column" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map(h => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Merchant Column *</Label>
                <Select value={mapping.merchant} onValueChange={(v) => setMapping({ ...mapping, merchant: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select merchant column" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map(h => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Amount Column</Label>
                <Select value={mapping.amount} onValueChange={(v) => setMapping({ ...mapping, amount: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select amount column" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map(h => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Debit Column (Optional)</Label>
                <Select
                  value={mapping.debit || NO_CATEGORY_VALUE}
                  onValueChange={(v) => setMapping({ ...mapping, debit: v === NO_CATEGORY_VALUE ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select debit column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY_VALUE}>None</SelectItem>
                    {headers.map(h => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Credit Column (Optional)</Label>
                <Select
                  value={mapping.credit || NO_CATEGORY_VALUE}
                  onValueChange={(v) => setMapping({ ...mapping, credit: v === NO_CATEGORY_VALUE ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select credit column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY_VALUE}>None</SelectItem>
                    {headers.map(h => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category Column (Optional)</Label>
                <Select
                  value={mapping.category || NO_CATEGORY_VALUE}
                  onValueChange={(v) => setMapping({ ...mapping, category: v === NO_CATEGORY_VALUE ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY_VALUE}>None</SelectItem>
                    {headers.map(h => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes Column (Optional)</Label>
                <Select
                  value={mapping.notes || NO_CATEGORY_VALUE}
                  onValueChange={(v) => setMapping({ ...mapping, notes: v === NO_CATEGORY_VALUE ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select notes column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY_VALUE}>None</SelectItem>
                    {headers.map(h => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <div className="space-y-1">
                <Label className="font-medium">Account</Label>
                <p className="text-sm text-muted-foreground">
                  Keeps statements from different banks or cards separate, so identical-looking
                  transactions across accounts are never merged as duplicates.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Account column (auto-detected)</Label>
                  <Select
                    value={mapping.account || NO_CATEGORY_VALUE}
                    onValueChange={(value) =>
                      setMapping({ ...mapping, account: value === NO_CATEGORY_VALUE ? '' : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CATEGORY_VALUE}>None</SelectItem>
                      {headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-label">Account label (fallback)</Label>
                  <Input
                    id="account-label"
                    value={accountLabel}
                    onChange={(event) => setAccountLabel(event.target.value)}
                    placeholder="e.g. Chase Checking"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used for rows without an account column value.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="invert-amounts"
                  checked={invertAmounts}
                  onCheckedChange={(checked) => setInvertAmounts(checked === true)}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <Label htmlFor="invert-amounts" className="font-medium">
                    Invert amounts during import
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Leave this off to preserve normalized CSV signs. Turn it on only if your bank exports expenses as positive values and credits as negative values.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button onClick={handlePreview}>
                Continue to Preview
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Step */}
      {step === 'preview' && (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Preview Import</h3>
              <p className="text-muted-foreground">
                Review the first 20 rows before importing
              </p>
            </div>

            <div className="border rounded-lg overflow-hidden mb-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 20).map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        {(() => {
                          const parsedDate = parseDateOnly(row[mapping.date] || '');
                          return parsedDate ? format(parseISO(parsedDate), 'MMM dd, yyyy') : 'Invalid date';
                        })()}
                      </TableCell>
                      <TableCell>{row[mapping.merchant]}</TableCell>
                      <TableCell
                        className={
                          (parseMappedAmount(row) ?? 0) < 0 ? 'text-destructive' : 'text-success'
                        }
                      >
                        {(() => {
                          const parsedAmount = parseMappedAmount(row);
                          if (parsedAmount === null) {
                            return 'Invalid amount';
                          }

                          return `${parsedAmount < 0 ? '-' : '+'}$${Math.abs(parsedAmount).toFixed(2)}`;
                        })()}
                      </TableCell>
                      <TableCell>
                        {mapping.category && row[mapping.category] ? row[mapping.category] : 'Uncategorized'}
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate text-muted-foreground">
                        {mapping.notes && row[mapping.notes] ? row[mapping.notes] : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Alert className="mb-6">
              <AlertDescription>
                Ready to import {parsedData.length} transactions with {invertAmounts ? 'inverted' : 'preserved'} amount signs
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Back
              </Button>
              <Button onClick={handleImport}>
                Import {parsedData.length} Transactions
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Step */}
      {step === 'success' && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/12">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">Import Successful!</h3>
              <p className="mb-6 text-muted-foreground">
                {importedCount > 0
                  ? `Successfully imported ${importedCount} new transaction${importedCount === 1 ? '' : 's'}`
                  : 'No new transactions to import'}
                {skippedDuplicates > 0
                  ? ` — ${skippedDuplicates} duplicate${skippedDuplicates === 1 ? '' : 's'} from earlier imports skipped`
                  : ''}
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => navigate('/transactions')}>
                  View Transactions
                </Button>
                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
