import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useData } from '../context/DataContext';
import Papa from 'papaparse';
import { format } from 'date-fns';
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
    category: '',
    notes: '',
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [importedCount, setImportedCount] = useState(0);

  const parseCsvFile = useCallback((file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
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

        // Auto-detect common column names
        const dateCol = cols.find(c => /date/i.test(c)) || '';
        const merchantCol = cols.find(c => /(merchant|description|name|payee)/i.test(c)) || '';
        const amountCol = cols.find(c => /amount/i.test(c)) || '';
        const notesCol = cols.find(c => /(note|memo|details|location|time)/i.test(c)) || '';
        
        setMapping({
          date: dateCol,
          merchant: merchantCol,
          amount: amountCol,
          category: '',
          notes: notesCol,
        });
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
    if (!mapping.amount) newErrors.push('Amount column is required');
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handlePreview = () => {
    if (!validateMapping()) return;
    setStep('preview');
  };

  const parseDateToIso = (rawDate: string): string | null => {
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  };

  const handleImport = async () => {
    const importErrors: string[] = [];

    const transactions = parsedData.map((row, index) => {
      const merchant = (row[mapping.merchant] || '').trim();
      const rawAmount = (row[mapping.amount] || '').replace(/[^0-9.-]/g, '');
      let amount = parseFloat(rawAmount);
      const parsedDate = parseDateToIso(row[mapping.date] || '');

      if (!merchant) {
        importErrors.push(`Row ${index + 1}: Merchant is missing`);
      }

      if (Number.isNaN(amount)) {
        importErrors.push(`Row ${index + 1}: Amount is invalid`);
        amount = 0;
      }

      if (!parsedDate) {
        importErrors.push(`Row ${index + 1}: Date is invalid`);
      }

      // If amount is positive but should be negative (expense), make it negative.
      if (amount > 0 && !merchant.toLowerCase().includes('payment')) {
        amount = -amount;
      }

      return {
        date: parsedDate || new Date(0).toISOString(),
        merchant,
        amount,
        category: mapping.category && row[mapping.category] ? row[mapping.category] : 'Uncategorized',
        notes: mapping.notes && row[mapping.notes] ? String(row[mapping.notes]).trim() : '',
      };
    });

    if (importErrors.length > 0) {
      setErrors(importErrors.slice(0, 10));
      return;
    }

    await importTransactions(transactions);
    setImportedCount(transactions.length);
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
                <Label>Amount Column *</Label>
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
                          const parsedDate = parseDateToIso(row[mapping.date] || '');
                          return parsedDate ? format(new Date(parsedDate), 'MMM dd, yyyy') : 'Invalid date';
                        })()}
                      </TableCell>
                      <TableCell>{row[mapping.merchant]}</TableCell>
                      <TableCell className={parseFloat(row[mapping.amount]) < 0 ? 'text-destructive' : 'text-success'}>
                        ${Math.abs(parseFloat(row[mapping.amount])).toFixed(2)}
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
                Ready to import {parsedData.length} transactions
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
                Successfully imported {importedCount} transactions
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
