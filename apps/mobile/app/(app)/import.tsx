import {
  detectCsvTransactionColumns,
  generateSampleBudgets,
  generateSampleGoals,
  generateSampleTransactions,
  parseCsvTransactionRow,
} from "@pocketpilot/core";
import { useData } from "@pocketpilot/services/src/react";
import { useRouter } from "expo-router";
import {
  DatabaseZap,
  FileSpreadsheet,
  FileUp,
  Plus,
  TriangleAlert,
  X,
} from "lucide-react-native";
import Papa from "papaparse";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { EmptyStateCard } from "@/components/data/empty-state-card";
import { SectionCard } from "@/components/data/section-card";
import { Screen } from "@/components/screen";
import { StackScreenScroll } from "@/components/stack-screen-scroll";
import { mobileServices } from "@/config/services";
import { hapticSuccess } from "@/lib/haptics";
import { useAppTheme } from "@/providers/theme-provider";
import { fontFamilies } from "@/theme/tokens";

type ParsedRow = Record<string, string>;

interface CsvFile {
  name: string;
  rows: ParsedRow[];
  account: string;
}

export default function ImportScreen() {
  const router = useRouter();
  const { importTransactions, addBudget, addGoal, transactions } = useData();
  const { colors } = useAppTheme();
  const [files, setFiles] = useState<CsvFile[]>([]);
  const [error, setError] = useState("");
  const [isPickingFile, setIsPickingFile] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isLoadingSampleData, setIsLoadingSampleData] = useState(false);

  const allRows = useMemo(() => files.flatMap((f) => f.rows), [files]);
  const totalFiles = files.length;
  const totalRows = allRows.length;

  async function handlePickFile() {
    setIsPickingFile(true);
    setError("");

    try {
      const pickedFile = await mobileServices.fileImport.pickCsvFile();
      if (!pickedFile) return;

      const csvText = await pickedFile.text();
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            setError(
              results.errors
                .slice(0, 3)
                .map((e) => `Row ${e.row ?? "?"}: ${e.message}`)
                .join("\n")
            );
            return;
          }

          const nextRows = (results.data as ParsedRow[]).filter((row) =>
            Object.values(row).some((v) => String(v || "").trim() !== "")
          );

          if (nextRows.length === 0) {
            setError(`"${pickedFile.name}" contains no usable rows.`);
            return;
          }

          const defaultAccount = pickedFile.name.replace(/\.[^.]+$/, "");
          setFiles((current) => [
            ...current,
            { name: pickedFile.name, rows: nextRows, account: defaultAccount },
          ]);
        },
        error: (e: { message?: string }) => {
          setError(e.message || `Failed to parse "${pickedFile.name}".`);
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to pick a CSV file.");
    } finally {
      setIsPickingFile(false);
    }
  }

  function handleRemoveFile(index: number) {
    setFiles((current) => current.filter((_, i) => i !== index));
  }

  function handleUpdateAccount(index: number, account: string) {
    setFiles((current) =>
      current.map((f, i) => (i === index ? { ...f, account } : f))
    );
  }

  async function handleImport() {
    if (allRows.length === 0 || isImporting) return;

    setIsImporting(true);
    setError("");

    try {
      const importErrors: string[] = [];
      const transactions = files.flatMap(({ rows, account }) => {
        const headers = Object.keys(rows[0] || {});
        const mapping = detectCsvTransactionColumns(headers);

        if (
          !mapping.date ||
          !mapping.merchant ||
          (!mapping.amount && !mapping.debit && !mapping.credit)
        ) {
          throw new Error(
            `"${account}": CSV must have recognizable date, merchant, and amount/debit/credit columns.`
          );
        }

        return rows.map((row, index) => {
          const result = parseCsvTransactionRow(row, mapping, index + 1, {
            fallbackAccount: account.trim(),
          });
          importErrors.push(...result.errors);
          return result.transaction;
        });
      });

      if (importErrors.length > 0) {
        throw new Error(importErrors.slice(0, 3).join("\n"));
      }

      const result = await importTransactions(transactions);
      hapticSuccess();
      const summary =
        result.imported > 0
          ? `Imported ${result.imported} new transaction${result.imported === 1 ? "" : "s"} from ${totalFiles} file${totalFiles === 1 ? "" : "s"}.`
          : "No new transactions found.";
      const duplicateNote =
        result.skippedDuplicates > 0
          ? ` Skipped ${result.skippedDuplicates} duplicate${result.skippedDuplicates === 1 ? "" : "s"}.`
          : "";
      await mobileServices.dialog.alert(`${summary}${duplicateNote}`, "Import Complete");
      router.replace("/transactions");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setIsImporting(false);
    }
  }

  async function handleLoadSampleData() {
    if (isLoadingSampleData) return;

    if (transactions.length > 0) {
      const confirmed = await mobileServices.dialog.confirm(
        `You already have ${transactions.length} transaction${transactions.length === 1 ? "" : "s"}. Loading sample data will add 50 more random transactions on top. Continue?`,
        "Add sample data?"
      );
      if (!confirmed) return;
    }

    setError("");
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
        "Sample workspace ready"
      );
      router.replace("/(app)/(tabs)/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sample data.");
    } finally {
      setIsLoadingSampleData(false);
    }
  }

  return (
    <Screen>
      <StackScreenScroll>
        {/* Add file button */}
        <SectionCard
          title={totalFiles === 0 ? "Pick CSV files" : "Add another file"}
          subtitle={
            totalFiles === 0
              ? "Add one or more bank statements — each file gets its own account label."
              : `${totalFiles} file${totalFiles === 1 ? "" : "s"} loaded, ${totalRows} rows total.`
          }
        >
          <Pressable
            className="flex-row items-center justify-center gap-2 rounded-xl px-4 py-4"
            style={{ backgroundColor: colors.primary }}
            onPress={handlePickFile}
            disabled={isPickingFile}
          >
            {totalFiles === 0 ? (
              <FileSpreadsheet size={18} color={colors.primaryForeground} strokeWidth={2.2} />
            ) : (
              <Plus size={18} color={colors.primaryForeground} strokeWidth={2.2} />
            )}
            <Text
              className="text-[16px]"
              style={{ color: colors.primaryForeground, fontFamily: fontFamilies.sans.semibold }}
            >
              {isPickingFile ? "Picking file..." : totalFiles === 0 ? "Choose CSV" : "Add CSV"}
            </Text>
          </Pressable>
        </SectionCard>

        {/* Loaded files list */}
        {files.length > 0 && (
          <SectionCard
            title="Files to import"
            subtitle="Edit account labels to keep statements from different banks separate."
          >
            <View className="gap-3">
              {files.map((file, index) => (
                <View
                  key={`${file.name}-${index}`}
                  className="rounded-xl border px-4 py-3 gap-2"
                  style={{ backgroundColor: colors.card, borderColor: colors.border }}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 flex-row items-center gap-2">
                      <FileSpreadsheet size={14} color={colors.mutedForeground} strokeWidth={2} />
                      <Text
                        className="text-[14px] flex-1"
                        numberOfLines={1}
                        style={{ color: colors.foreground, fontFamily: fontFamilies.sans.medium }}
                      >
                        {file.name}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <Text className="text-[12px]" style={{ color: colors.mutedForeground }}>
                        {file.rows.length} rows
                      </Text>
                      <Pressable
                        onPress={() => handleRemoveFile(index)}
                        hitSlop={8}
                      >
                        <X size={16} color={colors.mutedForeground} strokeWidth={2} />
                      </Pressable>
                    </View>
                  </View>
                  <TextInput
                    value={file.account}
                    onChangeText={(text) => handleUpdateAccount(index, text)}
                    placeholder="Account label (e.g. Chase Checking)"
                    placeholderTextColor={colors.mutedForeground}
                    className="rounded-lg px-3 py-2 text-[14px]"
                    style={{ backgroundColor: colors.glass, color: colors.foreground }}
                  />
                </View>
              ))}
            </View>
          </SectionCard>
        )}

        {/* Sample data */}
        <SectionCard
          title="Try sample data"
          subtitle="Load a realistic PocketPilot workspace with transactions, budgets, and goals."
        >
          <Pressable
            className="flex-row items-center justify-center gap-2 rounded-xl px-4 py-4"
            style={{ backgroundColor: colors.secondary }}
            onPress={handleLoadSampleData}
            disabled={isLoadingSampleData}
          >
            <DatabaseZap size={18} color={colors.secondaryForeground} strokeWidth={2.2} />
            <Text
              className="text-[16px]"
              style={{ color: colors.secondaryForeground, fontFamily: fontFamilies.sans.semibold }}
            >
              {isLoadingSampleData ? "Loading..." : "Load sample workspace"}
            </Text>
          </Pressable>
        </SectionCard>

        {/* Error */}
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

        {/* Import button */}
        {totalRows > 0 ? (
          <SectionCard
            title="Import into PocketPilot"
            subtitle="Duplicates are skipped automatically."
          >
            <Pressable
              className="flex-row items-center justify-center gap-2 rounded-xl px-4 py-4"
              style={{ backgroundColor: colors.primary }}
              onPress={handleImport}
              disabled={isImporting}
            >
              <FileUp size={18} color={colors.primaryForeground} strokeWidth={2.2} />
              <Text
                className="text-[16px]"
                style={{ color: colors.primaryForeground, fontFamily: fontFamilies.sans.semibold }}
              >
                {isImporting
                  ? "Importing..."
                  : `Import ${totalRows} rows from ${totalFiles} file${totalFiles === 1 ? "" : "s"}`}
              </Text>
            </Pressable>
          </SectionCard>
        ) : (
          !error && (
            <EmptyStateCard
              title="No files selected"
              description="Add CSV files or load the sample workspace to get started."
            />
          )
        )}
      </StackScreenScroll>
    </Screen>
  );
}
