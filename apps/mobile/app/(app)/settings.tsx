import { useData } from "@pocketpilot/services/src/react";
import { Download, Monitor, MoonStar, Plus, SunMedium, Trash2 } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { EmptyStateCard } from "@/components/data/empty-state-card";
import { KeyValueRow } from "@/components/data/key-value-row";
import { MetricGrid } from "@/components/data/metric-grid";
import { SectionCard } from "@/components/data/section-card";
import { StatCard } from "@/components/data/stat-card";
import { MenuRow } from "@/components/navigation/menu-row";
import { ShellCard } from "@/components/navigation/shell-card";
import { Screen } from "@/components/screen";
import { StackScreenScroll } from "@/components/stack-screen-scroll";
import { mobileServices } from "@/config/services";
import { useAppTheme } from "@/providers/theme-provider";
import { fontFamilies } from "@/theme/tokens";

export default function SettingsScreen() {
  const { colors, themePreference, setThemePreference } = useAppTheme();
  const { categories, transactions, budgets, goals, addCategory, clearAllData } = useData();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#3B82F6");
  const [feedback, setFeedback] = useState("");

  const exportSummary = useMemo(
    () => ({
      transactions: transactions.length,
      budgets: budgets.length,
      goals: goals.length,
      categories: categories.length,
    }),
    [budgets.length, categories.length, goals.length, transactions.length]
  );

  async function handleExportData() {
    setFeedback("");
    try {
      await mobileServices.dataExport.exportJson(
        `pocketpilot-export-${new Date().toISOString().split("T")[0]}.json`,
        {
          transactions,
          budgets,
          goals,
          categories,
          exportedAt: new Date().toISOString(),
        }
      );
      setFeedback("Data export prepared successfully.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to export data.");
    }
  }

  async function handleAddCategory() {
    const categoryName = newCategoryName.trim();
    if (!categoryName) {
      setFeedback("Category name is required.");
      return;
    }

    try {
      await addCategory({
        name: categoryName,
        color: newCategoryColor,
        icon: "Tag",
      });
      setNewCategoryName("");
      setNewCategoryColor("#3B82F6");
      setFeedback(`Added category "${categoryName}".`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to add category.");
    }
  }

  async function handleClearAllData() {
    const confirmed = await mobileServices.dialog.confirm(
      "This will delete all transactions, budgets, goals, and custom settings. This action cannot be undone.",
      "Clear all data?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await clearAllData();
      setFeedback("All user data was cleared successfully.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to clear user data.");
    }
  }

  return (
    <Screen>
      <StackScreenScroll>
        <ShellCard
          eyebrow="Appearance"
          title="Theme preference"
          bare
        >
          <View className="flex-row gap-3">
            {[
              {
                label: "Light",
                value: "light" as const,
                icon: (
                  <SunMedium
                    size={18}
                    color={
                      themePreference === "light" ? colors.primaryForeground : colors.foreground
                    }
                    strokeWidth={2.2}
                  />
                ),
              },
              {
                label: "Dark",
                value: "dark" as const,
                icon: (
                  <MoonStar
                    size={18}
                    color={
                      themePreference === "dark" ? colors.primaryForeground : colors.foreground
                    }
                    strokeWidth={2.2}
                  />
                ),
              },
              {
                label: "System",
                value: "system" as const,
                icon: (
                  <Monitor
                    size={18}
                    color={
                      themePreference === "system" ? colors.primaryForeground : colors.foreground
                    }
                    strokeWidth={2.2}
                  />
                ),
              },
            ].map((option) => {
              const isActive = themePreference === option.value;
              return (
                <Pressable
                  key={option.value}
                  className="flex-1 items-center rounded-xl px-3 py-4"
                  style={{ backgroundColor: isActive ? colors.primary : colors.card }}
                  onPress={() => setThemePreference(option.value)}
                >
                  {option.icon}
                  <Text
                    className="mt-2 text-[13px]"
                    style={{
                      color: isActive ? colors.primaryForeground : colors.foreground,
                      fontFamily: fontFamilies.sans.semibold,
                    }}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ShellCard>

        <MetricGrid>
          <StatCard
            label="Transactions"
            value={String(exportSummary.transactions)}
            detail="Included in export"
          />
          <StatCard
            label="Categories"
            value={String(exportSummary.categories)}
            detail="Current category list"
          />
        </MetricGrid>

        <SectionCard title="Export data">
          <Pressable
            className="flex-row items-center justify-center gap-2 rounded-xl px-4 py-4"
            style={{ backgroundColor: colors.primary }}
            onPress={handleExportData}
          >
            <Download size={18} color={colors.primaryForeground} strokeWidth={2.2} />
            <Text
              className="text-[16px]"
              style={{ color: colors.primaryForeground, fontFamily: fontFamilies.sans.semibold }}
            >
              Export all data
            </Text>
          </Pressable>
        </SectionCard>

        <SectionCard title="Add category">
          <View className="gap-3">
            <TextInput
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="New category name"
              placeholderTextColor={colors.mutedForeground}
              className="rounded-xl border px-4 py-4 text-[16px]"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.muted,
                color: colors.foreground,
                fontFamily: fontFamilies.sans.regular,
              }}
            />
            <TextInput
              value={newCategoryColor}
              onChangeText={setNewCategoryColor}
              placeholder="#3B82F6"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              className="rounded-xl border px-4 py-4 text-[16px]"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.muted,
                color: colors.foreground,
                fontFamily: fontFamilies.sans.regular,
              }}
            />
            <Pressable
              className="flex-row items-center justify-center gap-2 rounded-xl px-4 py-4"
              style={{ backgroundColor: colors.secondary }}
              onPress={handleAddCategory}
            >
              <Plus size={18} color={colors.secondaryForeground} strokeWidth={2.2} />
              <Text
                className="text-[16px]"
                style={{ color: colors.secondaryForeground, fontFamily: fontFamilies.sans.semibold }}
              >
                Add category
              </Text>
            </Pressable>
          </View>
        </SectionCard>

        <SectionCard title="Categories">
          <View className="gap-3">
            {categories.length > 0 ? (
              categories.map((category) => (
                <KeyValueRow
                  key={category.id}
                  label={category.name}
                  value={`${transactions.filter((transaction) => transaction.category === category.name).length} transactions`}
                />
              ))
            ) : (
              <EmptyStateCard
                title="No categories yet"
                description="Add a category above to get started."
              />
            )}
          </View>
        </SectionCard>

        <SectionCard title="Danger zone">
          <Pressable
            className="flex-row items-center justify-center gap-2 rounded-xl px-4 py-4"
            style={{ backgroundColor: colors.danger }}
            onPress={handleClearAllData}
          >
            <Trash2 size={18} color={colors.primaryForeground} strokeWidth={2.2} />
            <Text
              className="text-[16px]"
              style={{ color: colors.primaryForeground, fontFamily: fontFamilies.sans.semibold }}
            >
              Clear all data
            </Text>
          </Pressable>
        </SectionCard>

        {feedback ? <EmptyStateCard title="Settings update" description={feedback} /> : null}
      </StackScreenScroll>
    </Screen>
  );
}
