import { Pressable, Text, View } from 'react-native';
import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { DatabaseZap, FileSpreadsheet, FileUp, TriangleAlert, X } from 'lucide-react-native';
import Papa from 'papaparse';
import { generateSampleBudgets, generateSampleGoals, generateSampleTransactions } from '@pocketpilot/core';
import { useData } from '@pocketpilot/services/src/react';
import { Screen } from '@/components/screen';
import { IconButton } from '@/components/navigation/icon-button';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { EmptyStateCard } from '@/components/data/empty-state-card';
import { KeyValueRow } from '@/components/data/key-value-row';
import { SectionCard } from '@/components/data/section-card';
import { StackScreenScroll } from '@/components/stack-screen-scroll';
import { useAppTheme } from '@/providers/theme-provider';
import { mobileServices } from '@/config/services';

type ParsedRow = Record<string, string>;

export default function ImportScreen() {
  const router = useRouter();
  const { importTransactions, addBudget, addGoal } = useData();
  const { colors } = useAppTheme();
  const [fileName, setFileName] = useState('');
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

  function parseDateToIso(rawValue: string) {
    const date = new Date(rawValue);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  }

  async function handleImport() {
    if (parsedRows.length === 0 || isImporting) {
      return;
    }

    setIsImporting(true);
    setError('');

    try {
      const headers = Object.keys(parsedRows[0] || {});
      const findHeader = (patterns: RegExp[]) => headers.find((header) => patterns.some((pattern) => pattern.test(header))) || '';
      const dateHeader = findHeader([/date/i]);
      const merchantHeader = findHeader([/merchant/i, /description/i, /payee/i, /name/i]);
      const amountHeader = findHeader([/amount/i, /total/i, /value/i]);
      const categoryHeader = findHeader([/category/i]);
      const notesHeader = findHeader([/note/i, /memo/i, /detail/i]);

      if (!dateHeader || !merchantHeader || !amountHeader) {
        throw new Error('CSV must include recognizable date, merchant, and amount columns.');
      }

      const transactions = parsedRows.map((row, index) => {
        const merchant = String(row[merchantHeader] || '').trim();
        const rawAmount = String(row[amountHeader] || '').replace(/[^0-9.-]/g, '');
        let amount = parseFloat(rawAmount);
        const isoDate = parseDateToIso(String(row[dateHeader] || ''));

        if (!merchant) {
          throw new Error(`Row ${index + 1} is missing a merchant value.`);
        }

        if (Number.isNaN(amount)) {
          throw new Error(`Row ${index + 1} has an invalid amount.`);
        }

        if (!isoDate) {
          throw new Error(`Row ${index + 1} has an invalid date.`);
        }

        if (amount > 0 && !merchant.toLowerCase().includes('payment')) {
          amount = -amount;
        }

        return {
          date: isoDate,
          merchant,
          amount,
          category: categoryHeader && row[categoryHeader] ? String(row[categoryHeader]).trim() : 'Uncategorized',
          notes: notesHeader && row[notesHeader] ? String(row[notesHeader]).trim() : '',
        };
      });

      await importTransactions(transactions);
      await mobileServices.dialog.alert(`Imported ${transactions.length} transactions successfully.`, 'Import Complete');
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
      <StackScreenScroll
        header={
          <ScreenHeader
            eyebrow="Import"
            title="Import transactions"
            subtitle="This route now behaves like a real mobile modal launched from transactions."
            rightSlot={
              <IconButton
                label="Close import"
                onPress={() => router.back()}
                icon={<X size={18} color={colors.foreground} strokeWidth={2.2} />}
              />
            }
          />
        }
      >
        <SectionCard
          title="Pick a CSV file"
          subtitle="The file picker comes from the shared mobile services adapter and keeps import logic out of the UI layer."
        >
          <Pressable
            className="flex-row items-center justify-center gap-2 rounded-[20px] px-4 py-4"
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
            className="flex-row items-center justify-center gap-2 rounded-[20px] px-4 py-4"
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
                    className="rounded-[22px] border px-4 py-4"
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
              title="Import into PocketPilot"
              subtitle="Rows will be normalized, categorized through the shared layer, and added to your live transaction feed."
            >
              <Pressable
                className="flex-row items-center justify-center gap-2 rounded-[20px] px-4 py-4"
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
