import { Pressable, Text, TextInput, View } from 'react-native';
import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { DatabaseZap, FileSpreadsheet, FileUp, TriangleAlert } from 'lucide-react-native';
import Papa from 'papaparse';
import {
  detectCsvTransactionColumns,
  generateSampleBudgets,
  generateSampleGoals,
  generateSampleTransactions,
  parseCsvTransactionRow,
} from '@pocketpilot/core';
import { useData } from '@pocketpilot/services/src/react';
import { Screen } from '@/components/screen';
import { EmptyStateCard } from '@/components/data/empty-state-card';
import { KeyValueRow } from '@/components/data/key-value-row';
import { SectionCard } from '@/components/data/section-card';
import { StackScreenScroll } from '@/components/stack-screen-scroll';
import { useAppTheme } from '@/providers/theme-provider';
import { mobileServices } from '@/config/services';
import { hapticSuccess } from '@/lib/haptics';

type ParsedRow = Record<string, string>;

export default function ImportScreen() {
  const router = useRouter();
  const { importTransactions, addBudget, addGoal } = useData();
  const { colors } = useAppTheme();
  const [fileName, setFileName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [error, setError] = useState('');
  const [isPickingFile, setIsPickingFile] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isLoadingSampleData, setIsLoadingSampleData] = useState(false);

  const preview = useMemo(() => parsedRows.slice(0, 5), [parsedRows]);

  async function handlePickFile() {
    setIsPickingFile(true);
    setError('');

    try {
      const pickedFile = await mobileServices.fileImport.pickCsvFile();
      if (!pickedFile) {
        return;
      }

      const csvText = await pickedFile.text();
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            setError(results.errors.slice(0, 3).map((nextError) => `Row ${nextError.row ?? '?'}: ${nextError.message}`).join('\n'));
            setParsedRows([]);
            setFileName('');
            return;
          }

          const nextRows = (results.data as ParsedRow[]).filter((row) =>
            Object.values(row).some((value) => String(value || '').trim() !== ''),
          );

          if (nextRows.length === 0) {
            setError('This CSV file did not contain any usable rows.');
            setParsedRows([]);
            setFileName('');
            return;
          }

          setFileName(pickedFile.name);
          setAccountName((current) => current || pickedFile.name.replace(/\.[^.]+$/, ''));
          setParsedRows(nextRows);
        },
        error: (nextError: { message?: string }) => {
          setError(nextError.message || 'Failed to parse the selected CSV file.');
          setParsedRows([]);
          setFileName('');
        },
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to pick a CSV file.');
      setParsedRows([]);
      setFileName('');
    } finally {
      setIsPickingFile(false);
    }
  }

  async function handleImport() {
    if (parsedRows.length === 0 || isImporting) {
      return;
    }

    setIsImporting(true);
    setError('');

    try {
      const headers = Object.keys(parsedRows[0] || {});
      const mapping = detectCsvTransactionColumns(headers);

      if (!mapping.date || !mapping.merchant || (!mapping.amount && !mapping.debit && !mapping.credit)) {
        throw new Error('CSV must include recognizable date, merchant, and amount or debit/credit columns.');
      }

      const importErrors: string[] = [];
      const fallbackAccount = accountName.trim();
      const transactions = parsedRows.map((row, index) => {
        const result = parseCsvTransactionRow(row, mapping, index + 1, { fallbackAccount });
        importErrors.push(...result.errors);
        return result.transaction;
      });

      if (importErrors.length > 0) {
        throw new Error(importErrors.slice(0, 3).join('\n'));
      }

      const result = await importTransactions(transactions);
      hapticSuccess();
      const summary =
        result.imported > 0
          ? `Imported ${result.imported} new transaction${result.imported === 1 ? '' : 's'}.`
          : 'No new transactions found.';
      const duplicateNote =
        result.skippedDuplicates > 0
          ? ` Skipped ${result.skippedDuplicates} duplicate${result.skippedDuplicates === 1 ? '' : 's'} already in your workspace.`
          : '';
      await mobileServices.dialog.alert(`${summary}${duplicateNote}`, 'Import Complete');
      router.replace('/transactions');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Import failed.');
    } finally {
      setIsImporting(false);
    }
  }

  async function handleLoadSampleData() {
    if (isLoadingSampleData) {
      return;
    }

    setError('');
    setIsLoadingSampleData(true);

    try {
      const sampleTransactions = generateSampleTransactions(50);
      const sampleBudgets = generateSampleBudgets();
      const sampleGoals = generateSampleGoals();

      await importTransactions(sampleTransactions);
      await Promise.all(sampleBudgets.map((budget) => addBudget(budget)));
      await Promise.all(sampleGoals.map((goal) => addGoal(goal)));

      hapticSuccess();
      await mobileServices.dialog.alert(
        `Loaded ${sampleTransactions.length} sample transactions, ${sampleBudgets.length} budgets, and ${sampleGoals.length} goals.`,
        'Sample workspace ready',
      );
      router.replace('/(app)/(tabs)/dashboard');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load sample data.');
    } finally {
      setIsLoadingSampleData(false);
    }
  }

  return (
    <Screen>
      <StackScreenScroll>
        <SectionCard
          title="Pick a CSV file"
          subtitle="The file picker comes from the shared mobile services adapter and keeps import logic out of the UI layer."
        >
          <Pressable
            className="flex-row items-center justify-center gap-2 rounded-xl px-4 py-4"
            style={{ backgroundColor: colors.primary }}
            onPress={handlePickFile}
            disabled={isPickingFile}
          >
            <FileSpreadsheet size={18} color={colors.primaryForeground} strokeWidth={2.2} />
            <Text className="text-sm font-semibold" style={{ color: colors.primaryForeground }}>
              {isPickingFile ? 'Picking file...' : 'Choose CSV'}
            </Text>
          </Pressable>
        </SectionCard>

        <SectionCard
          title="Try sample data"
          subtitle="Load a realistic PocketPilot workspace with transactions, budgets, and goals so the app is explorable right away."
        >
          <Pressable
            className="flex-row items-center justify-center gap-2 rounded-xl px-4 py-4"
            style={{ backgroundColor: colors.secondary }}
            onPress={handleLoadSampleData}
            disabled={isLoadingSampleData}
          >
            <DatabaseZap size={18} color={colors.secondaryForeground} strokeWidth={2.2} />
            <Text className="text-sm font-semibold" style={{ color: colors.secondaryForeground }}>
              {isLoadingSampleData ? 'Loading sample data...' : 'Load sample workspace'}
            </Text>
          </Pressable>
        </SectionCard>

        {error ? (
          <EmptyStateCard title="Import issue" description={error}>
            <View className="flex-row items-center gap-2">
              <TriangleAlert size={16} color={colors.danger} strokeWidth={2.2} />
              <Text className="text-sm" style={{ color: colors.danger }}>
                Review the file and try again.
              </Text>
            </View>
          </EmptyStateCard>
        ) : null}

        {parsedRows.length > 0 ? (
          <>
            <SectionCard
              title="Preview"
              subtitle={`${parsedRows.length} rows detected in ${fileName}`}
            >
              <View className="gap-3">
                {preview.map((row, index) => (
                  <View
                    key={`${index}-${Object.values(row).join('-')}`}
                    className="rounded-xl border px-4 py-4"
                    style={{
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    }}
                  >
                    {Object.entries(row)
                      .slice(0, 4)
                      .map(([label, value]) => (
                        <KeyValueRow key={label} label={label} value={String(value || '')} emphasizeLabel={false} />
                      ))}
                  </View>
                ))}
              </View>
            </SectionCard>

            <SectionCard
              title="Account"
              subtitle="Detected automatically when the CSV has an account/card column; otherwise every imported row gets this label. Keeps statements from different banks separate."
            >
              <TextInput
                value={accountName}
                onChangeText={setAccountName}
                placeholder="e.g. Chase Checking"
                placeholderTextColor={colors.mutedForeground}
                className="rounded-xl px-4 py-3 text-[16px]"
                style={{ backgroundColor: colors.glass, color: colors.foreground }}
              />
            </SectionCard>

            <SectionCard
              title="Import into PocketPilot"
              subtitle="Rows will be normalized, categorized through the shared layer, and added to your live transaction feed."
            >
              <Pressable
                className="flex-row items-center justify-center gap-2 rounded-xl px-4 py-4"
                style={{ backgroundColor: colors.primary }}
                onPress={handleImport}
                disabled={isImporting}
              >
                <FileUp size={18} color={colors.primaryForeground} strokeWidth={2.2} />
                <Text className="text-sm font-semibold" style={{ color: colors.primaryForeground }}>
                  {isImporting ? 'Importing...' : `Import ${parsedRows.length} rows`}
                </Text>
              </Pressable>
            </SectionCard>
          </>
        ) : (
          <EmptyStateCard
            title="No file selected"
            description="Choose a CSV or load the sample workspace to explore the mobile app with realistic data."
          />
        )}
      </StackScreenScroll>
    </Screen>
  );
}
