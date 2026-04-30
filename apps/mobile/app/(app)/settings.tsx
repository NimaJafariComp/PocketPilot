import { Pressable, Text, TextInput, View } from 'react-native';
import { useMemo, useState } from 'react';
import { Download, MoonStar, Monitor, Plus, SunMedium, Trash2 } from 'lucide-react-native';
import { useData } from '@pocketpilot/services/src/react';
import { Screen } from '@/components/screen';
import { EmptyStateCard } from '@/components/data/empty-state-card';
import { KeyValueRow } from '@/components/data/key-value-row';
import { MetricGrid } from '@/components/data/metric-grid';
import { SectionCard } from '@/components/data/section-card';
import { StatCard } from '@/components/data/stat-card';
import { MenuRow } from '@/components/navigation/menu-row';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { ShellCard } from '@/components/navigation/shell-card';
import { StackScreenScroll } from '@/components/stack-screen-scroll';
import { useAppTheme } from '@/providers/theme-provider';
import { mobileServices } from '@/config/services';

export default function SettingsScreen() {
  const { colors, themePreference, setThemePreference } = useAppTheme();
  const { categories, transactions, budgets, goals, addCategory, clearAllData } = useData();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6');
  const [feedback, setFeedback] = useState('');

  const exportSummary = useMemo(
    () => ({
      transactions: transactions.length,
      budgets: budgets.length,
      goals: goals.length,
      categories: categories.length,
    }),
    [budgets.length, categories.length, goals.length, transactions.length],
  );

  async function handleExportData() {
    setFeedback('');
    try {
      await mobileServices.dataExport.exportJson(
        `pocketpilot-export-${new Date().toISOString().split('T')[0]}.json`,
        {
          transactions,
          budgets,
          goals,
          categories,
          exportedAt: new Date().toISOString(),
        },
      );
      setFeedback('Data export prepared successfully.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Failed to export data.');
    }
  }

  async function handleAddCategory() {
    const categoryName = newCategoryName.trim();
    if (!categoryName) {
      setFeedback('Category name is required.');
      return;
    }

    try {
      await addCategory({
        name: categoryName,
        color: newCategoryColor,
        icon: 'Tag',
      });
      setNewCategoryName('');
      setNewCategoryColor('#3B82F6');
      setFeedback(`Added category "${categoryName}".`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Failed to add category.');
    }
  }

  async function handleClearAllData() {
    const confirmed = await mobileServices.dialog.confirm(
      'This will delete all transactions, budgets, goals, and custom settings. This action cannot be undone.',
      'Clear all data?',
    );

    if (!confirmed) {
      return;
    }

    try {
      await clearAllData();
      setFeedback('All user data was cleared successfully.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Failed to clear user data.');
    }
  }

  return (
    <Screen>
      <StackScreenScroll
        header={
          <ScreenHeader
            eyebrow="Settings"
            title="App settings"
            subtitle="Appearance, export, categories, and account-safe maintenance controls for your mobile workspace."
            backLabel="Back"
          />
        }
      >
        <ShellCard
          eyebrow="Appearance"
          title="Theme preference"
          description="Choose the look that feels best on your device and let the rest of the app follow along."
        >
          <View className="flex-row gap-3">
            {[
              {
                label: 'Light',
                value: 'light' as const,
                icon: <SunMedium size={18} color={themePreference === 'light' ? colors.primaryForeground : colors.foreground} strokeWidth={2.2} />,
              },
              {
                label: 'Dark',
                value: 'dark' as const,
                icon: <MoonStar size={18} color={themePreference === 'dark' ? colors.primaryForeground : colors.foreground} strokeWidth={2.2} />,
              },
              {
                label: 'System',
                value: 'system' as const,
                icon: <Monitor size={18} color={themePreference === 'system' ? colors.primaryForeground : colors.foreground} strokeWidth={2.2} />,
              },
            ].map((option) => {
              const isActive = themePreference === option.value;
              return (
                <Pressable
                  key={option.value}
                  className="flex-1 items-center rounded-[20px] px-3 py-4"
                  style={{ backgroundColor: isActive ? colors.primary : colors.card }}
                  onPress={() => setThemePreference(option.value)}
                >
                  {option.icon}
                  <Text
                    className="mt-2 text-xs font-semibold"
                    style={{ color: isActive ? colors.primaryForeground : colors.foreground }}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ShellCard>

        <MetricGrid>
          <StatCard label="Transactions" value={String(exportSummary.transactions)} detail="Included in export" />
          <StatCard label="Categories" value={String(exportSummary.categories)} detail="Current category list" />
        </MetricGrid>

        <SectionCard
          title="Export data"
          subtitle="Downloads your current shared PocketPilot data as JSON using the mobile export adapter."
        >
          <Pressable
            className="flex-row items-center justify-center gap-2 rounded-[20px] px-4 py-4"
            style={{ backgroundColor: colors.primary }}
            onPress={handleExportData}
          >
            <Download size={18} color={colors.primaryForeground} strokeWidth={2.2} />
            <Text className="text-sm font-semibold" style={{ color: colors.primaryForeground }}>
              Export all data
            </Text>
          </Pressable>
        </SectionCard>

        <SectionCard
          title="Add category"
          subtitle="Creates a custom category through the shared data hook."
        >
          <View className="gap-3">
            <TextInput
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="New category name"
              placeholderTextColor={colors.mutedForeground}
              className="rounded-[20px] border px-4 py-4 text-base"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.muted,
                color: colors.foreground,
              }}
            />
            <TextInput
              value={newCategoryColor}
              onChangeText={setNewCategoryColor}
              placeholder="#3B82F6"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              className="rounded-[20px] border px-4 py-4 text-base"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.muted,
                color: colors.foreground,
              }}
            />
            <Pressable
              className="flex-row items-center justify-center gap-2 rounded-[20px] px-4 py-4"
              style={{ backgroundColor: colors.secondary }}
              onPress={handleAddCategory}
            >
              <Plus size={18} color={colors.secondaryForeground} strokeWidth={2.2} />
              <Text className="text-sm font-semibold" style={{ color: colors.secondaryForeground }}>
                Add category
              </Text>
            </Pressable>
          </View>
        </SectionCard>

        <SectionCard
          title="Current categories"
          subtitle="Your categories are still sourced from shared PocketPilot state."
        >
          <View className="gap-3">
            {categories.length > 0 ? (
              categories.map((category) => (
                <KeyValueRow key={category.id} label={category.name} value={`${transactions.filter((transaction) => transaction.category === category.name).length} transactions`} />
              ))
            ) : (
              <EmptyStateCard title="No categories found" description="Default categories will appear once your data layer finishes seeding." />
            )}
          </View>
        </SectionCard>

        <SectionCard
          title="Danger zone"
          subtitle="Uses the shared confirmation dialog plus the shared clear-all-data action."
        >
          <Pressable
            className="flex-row items-center justify-center gap-2 rounded-[20px] px-4 py-4"
            style={{ backgroundColor: colors.danger }}
            onPress={handleClearAllData}
          >
            <Trash2 size={18} color={colors.primaryForeground} strokeWidth={2.2} />
            <Text className="text-sm font-semibold" style={{ color: colors.primaryForeground }}>
              Clear all data
            </Text>
          </Pressable>
        </SectionCard>

        {feedback ? <EmptyStateCard title="Settings update" description={feedback} /> : null}

        <View className="gap-3">
          <MenuRow
            title="App structure"
            description="Shared providers, tabs, and stack routes are working together as expected"
            icon={<Monitor size={20} color={colors.secondaryForeground} strokeWidth={2.2} />}
            onPress={() => {}}
          />
        </View>
      </StackScreenScroll>
    </Screen>
  );
}
