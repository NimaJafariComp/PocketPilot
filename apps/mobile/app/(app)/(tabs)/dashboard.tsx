import { Pressable, ScrollView, Text, View } from 'react-native';
import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowRight,
  DatabaseZap,
  Info,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Upload,
} from 'lucide-react-native';
import {
  buildDashboardViewModel,
  generateSampleBudgets,
  generateSampleGoals,
  generateSampleTransactions,
} from '@pocketpilot/core';
import { useData } from '@pocketpilot/services/src/react';
import { AlertBanner } from '@/components/data/alert-banner';
import { AvatarButton } from '@/components/navigation/avatar-button';
import { EmptyStateCard } from '@/components/data/empty-state-card';
import { ProgressSummaryRow } from '@/components/data/progress-summary-row';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { SectionCard } from '@/components/data/section-card';
import { TransactionRow } from '@/components/transactions/transaction-row';
import { VerticalBarChart } from '@/components/charts/vertical-bar-chart';
import { useAppTheme } from '@/providers/theme-provider';
import { mobileServices } from '@/config/services';
import { fontFamilies } from '@/theme/tokens';
import { formatCurrency, formatMonthLabel } from '@/lib/format';
import { FittedValueText } from '@/components/data/fitted-value-text';

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { transactions, budgets, goals, loading, importTransactions, addBudget, addGoal } = useData();
  const { colors, resolvedTheme } = useAppTheme();
  const [isLoadingSampleData, setIsLoadingSampleData] = useState(false);

  const model = useMemo(
    () => buildDashboardViewModel(transactions, budgets, goals),
    [budgets, goals, transactions],
  );

  async function handleLoadSampleData() {
    if (isLoadingSampleData) {
      return;
    }

    setIsLoadingSampleData(true);

    try {
      const sampleTransactions = generateSampleTransactions(50);
      const sampleBudgets = generateSampleBudgets();
      const sampleGoals = generateSampleGoals();

      await importTransactions(sampleTransactions);
      await Promise.all(sampleBudgets.map((budget) => addBudget(budget)));
      await Promise.all(sampleGoals.map((goal) => addGoal(goal)));

      await mobileServices.dialog.alert(
        'Sample data is ready. Explore transactions, budgets, goals, and insights across the mobile app.',
        'Workspace loaded',
      );
    } finally {
      setIsLoadingSampleData(false);
    }
  }

  return (
    <Screen atmospheric atmosphericIntensity="medium">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingTop: insets.top + 8, paddingBottom: 19 }}>
        <ScreenHeader
          eyebrow="Dashboard"
          title="Dashboard"
          subtitle={formatMonthLabel()}
          rightSlot={<AvatarButton />}
        />
        {loading ? (
          <EmptyStateCard
            title="Loading dashboard"
            description="Syncing transactions, budgets, and goals from the shared data layer."
          />
        ) : model.hasNoData ? (
          <>
            <View
              className="overflow-hidden rounded-[34px] border px-5 pb-6 pt-5"
              style={{
                backgroundColor: resolvedTheme === 'dark' ? '#0E1A2D' : '#F7FAFF',
                borderColor: colors.border,
              }}
            >
              <View
                className="absolute -right-10 -top-8 h-32 w-32 rounded-full"
                style={{
                  backgroundColor: resolvedTheme === 'dark' ? 'rgba(122, 182, 255, 0.18)' : 'rgba(43, 103, 246, 0.14)',
                }}
              />
              <View
                className="absolute -left-8 bottom-10 h-24 w-24 rounded-full"
                style={{
                  backgroundColor: resolvedTheme === 'dark' ? 'rgba(51, 209, 161, 0.18)' : 'rgba(31, 157, 114, 0.12)',
                }}
              />

              <View
                className="self-start rounded-full px-3 py-1.5"
                style={{ backgroundColor: colors.secondary }}
              >
                <Text
                  className="text-[11px] uppercase tracking-[1.8px]"
                  style={{ color: colors.secondaryForeground, fontFamily: fontFamilies.sans.semibold }}
                >
                  AI-powered financial clarity
                </Text>
              </View>

              <FittedValueText
                className="mt-5 text-[36px] leading-[40px] tracking-tight"
                style={{ color: colors.foreground, fontFamily: fontFamilies.serif.semibold }}
              >
                Your money, finally under control.
              </FittedValueText>
              <Text
                className="mt-3 text-sm leading-6"
                style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
              >
                Import your transactions, set smart budgets, track goals, and get AI-powered insights.
              </Text>

              <View className="mt-6 flex-row gap-3">
                <Pressable
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-[20px] px-4 py-4"
                  style={{ backgroundColor: colors.primary }}
                  onPress={() => router.push('/import')}
                >
                  <Upload size={18} color={colors.primaryForeground} strokeWidth={2.2} />
                  <Text
                    className="text-sm"
                    style={{ color: colors.primaryForeground, fontFamily: fontFamilies.sans.semibold }}
                  >
                    Import Transactions
                  </Text>
                </Pressable>
                <Pressable
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-[20px] px-4 py-4"
                  style={{ backgroundColor: colors.secondary }}
                  onPress={handleLoadSampleData}
                  disabled={isLoadingSampleData}
                >
                  <Sparkles size={18} color={colors.secondaryForeground} strokeWidth={2.2} />
                  <Text
                    className="text-sm"
                    style={{ color: colors.secondaryForeground, fontFamily: fontFamilies.sans.semibold }}
                  >
                    {isLoadingSampleData ? 'Loading...' : 'Try Sample Data'}
                  </Text>
                </Pressable>
              </View>

              <View className="mt-5 flex-row flex-wrap items-center gap-2">
                <Text
                  className="text-xs"
                  style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
                >
                  Supports
                </Text>
                {['CSV', 'OFX', 'QFX', 'QBO'].map((format) => (
                  <View
                    key={format}
                    className="rounded-full border px-2.5 py-1"
                    style={{ backgroundColor: colors.card, borderColor: colors.border }}
                  >
                    <Text
                      className="text-[11px]"
                      style={{ color: colors.foreground, fontFamily: fontFamilies.sans.medium }}
                    >
                      {format}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <SectionCard title="Everything you need" subtitle="Built for real financial life.">
              <View className="gap-3">
                {[
                  {
                    title: 'Smart Categorization',
                    description: 'Transactions are automatically sorted so cleanup takes less time.',
                  },
                  {
                    title: 'Budget Tracking',
                    description: 'Set monthly budgets per category and spot risk before you overspend.',
                  },
                  {
                    title: 'Goal Milestones',
                    description: 'Track savings goals with progress, contributions, and clear completion states.',
                  },
                  {
                    title: 'AI Insights',
                    description: 'Ask questions about your spending and get context from your own synced data.',
                  },
                ].map((item) => (
                  <View
                    key={item.title}
                    className="rounded-[22px] border px-4 py-4"
                    style={{ backgroundColor: colors.card, borderColor: colors.border }}
                  >
                    <Text
                      className="text-sm"
                      style={{ color: colors.foreground, fontFamily: fontFamilies.sans.semibold }}
                    >
                      {item.title}
                    </Text>
                    <Text
                      className="mt-1 text-sm leading-6"
                      style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
                    >
                      {item.description}
                    </Text>
                  </View>
                ))}
              </View>
            </SectionCard>

            <SectionCard title="Up and running in 3 steps" subtitle="The same onboarding story from web, adapted for mobile.">
              <View className="gap-3">
                {[
                  { step: '1', title: 'Import', description: 'Upload a CSV or load a sample workspace.' },
                  { step: '2', title: 'Categorize', description: 'Review AI-sorted merchants and adjust the edge cases.' },
                  { step: '3', title: 'Understand', description: 'Use budgets, goals, and insights to steer the next month.' },
                ].map((item) => (
                  <View key={item.step} className="flex-row items-start gap-4">
                    <View
                      className="h-10 w-10 items-center justify-center rounded-full"
                      style={{ backgroundColor: colors.primary }}
                    >
                      <Text
                        className="text-sm"
                        style={{ color: colors.primaryForeground, fontFamily: fontFamilies.sans.semibold }}
                      >
                        {item.step}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-sm"
                        style={{ color: colors.foreground, fontFamily: fontFamilies.sans.semibold }}
                      >
                        {item.title}
                      </Text>
                      <Text
                        className="mt-1 text-sm leading-6"
                        style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
                      >
                        {item.description}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </SectionCard>
          </>
        ) : (
          <>
            {model.alerts.map((alert) => {
              if (alert.kind === 'over-budget') {
                return (
                  <AlertBanner
                    key={alert.kind}
                    tone="danger"
                    message={`You've exceeded your monthly budget by ${formatCurrency(Math.round(alert.value))}.`}
                    actionLabel="Review budgets"
                    onActionPress={() => router.push('/budgets')}
                  />
                );
              }

              if (alert.kind === 'warning') {
                return (
                  <AlertBanner
                    key={alert.kind}
                    tone="warning"
                    message={`You've used ${Math.round(model.budgetPct)}% of your monthly budget with ${formatCurrency(Math.round(alert.value))} remaining.`}
                    actionLabel="View budgets"
                    onActionPress={() => router.push('/budgets')}
                  />
                );
              }

              return (
                <AlertBanner
                  key={alert.kind}
                  tone="neutral"
                  message={`${alert.value} transaction${alert.value === 1 ? '' : 's'} still need categorizing.`}
                  actionLabel="Categorize"
                  onActionPress={() => router.push('/transactions')}
                  icon={<Info size={16} color={colors.foreground} strokeWidth={2.2} />}
                />
              );
            })}

            {model.totalBudget > 0 ? (
              <View
                className="overflow-hidden rounded-[34px] border px-5 pb-6 pt-5"
                style={{
                  backgroundColor: resolvedTheme === 'dark' ? '#0E1A2D' : '#F7FAFF',
                  borderColor: colors.border,
                }}
              >
                <View
                  className="absolute -right-8 -top-12 h-36 w-36 rounded-full"
                  style={{
                    backgroundColor: resolvedTheme === 'dark' ? 'rgba(122, 182, 255, 0.16)' : 'rgba(43, 103, 246, 0.14)',
                  }}
                />
                <Text
                  className="text-[11px] uppercase tracking-[1.8px]"
                  style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.medium }}
                >
                  Total spent this month
                </Text>
                <View className="mt-3 flex-row items-end gap-2">
              <FittedValueText
                className="text-[34px] tracking-tight"
                style={{ color: colors.foreground, fontFamily: fontFamilies.sans.semibold }}
              >
                {formatCurrency(model.totalSpent)}
              </FittedValueText>
                  <Text
                    className="pb-1 text-base"
                    style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
                  >
                    / {formatCurrency(model.totalBudget)}
                  </Text>
                </View>
                <Text
                  className="mt-2 text-sm leading-6"
                  style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
                >
                  {model.remaining >= 0
                    ? `${formatCurrency(Math.round(model.remaining))} still available across all budgets`
                    : `${formatCurrency(Math.round(Math.abs(model.remaining)))} over budget`}
                </Text>
                <View className="mt-4 gap-1.5">
                  <View className="flex-row justify-between">
                    {['0%', `${Math.round(model.budgetPct)}% used`, '100%'].map((label) => (
                      <Text
                        key={label}
                        className="text-xs"
                        style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
                      >
                        {label}
                      </Text>
                    ))}
                  </View>
                  <View className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: colors.muted }}>
                    <View
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(model.budgetPct, 100)}%`,
                        backgroundColor:
                          model.budgetPct >= 100
                            ? colors.danger
                            : model.budgetPct >= 80
                              ? colors.warning
                              : colors.success,
                      }}
                    />
                  </View>
                </View>

                <View className="mt-5 flex-row gap-3">
                  <View className="flex-1 rounded-[22px] px-4 py-4" style={{ backgroundColor: colors.card }}>
                    <Text
                      className="text-[11px] uppercase tracking-[1.5px]"
                      style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.medium }}
                    >
                      Income
                    </Text>
                    <FittedValueText
                      className="mt-2 text-xl"
                      style={{ color: colors.success, fontFamily: fontFamilies.sans.semibold }}
                    >
                      {formatCurrency(model.totalIncome)}
                    </FittedValueText>
                  </View>
                  <View className="flex-1 rounded-[22px] px-4 py-4" style={{ backgroundColor: colors.card }}>
                    <Text
                      className="text-[11px] uppercase tracking-[1.5px]"
                      style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.medium }}
                    >
                      Remaining
                    </Text>
                    <FittedValueText
                      className="mt-2 text-xl"
                      style={{
                        color: model.remaining < 0 ? colors.danger : colors.foreground,
                        fontFamily: fontFamilies.sans.semibold,
                      }}
                    >
                      {formatCurrency(Math.abs(model.remaining))}
                    </FittedValueText>
                  </View>
                </View>
              </View>
            ) : null}

            <SectionCard title="Top Spending Categories" subtitle="Your biggest expense categories for the current month.">
              <VerticalBarChart data={model.topCategories} emptyLabel="No spending data yet" />
            </SectionCard>

            <SectionCard title="Goals" subtitle="A quick look at your current savings momentum.">
              <View className="gap-4">
                {model.goalProgress.length > 0 ? (
                  <>
                    {model.goalProgress.map((goal) => (
                      <ProgressSummaryRow
                        key={goal.id}
                        title={goal.name}
                        value={`${formatCurrency(goal.currentAmount)} / ${formatCurrency(goal.targetAmount)}`}
                        progress={goal.percentage}
                        progressLabel={`${Math.round(goal.percentage)}% funded`}
                      />
                    ))}
                    <Pressable
                      className="flex-row items-center justify-center gap-2 rounded-[20px] px-4 py-4"
                      style={{ backgroundColor: colors.secondary }}
                      onPress={() => router.push('/goals')}
                    >
                      <Text
                        className="text-sm"
                        style={{ color: colors.secondaryForeground, fontFamily: fontFamilies.sans.semibold }}
                      >
                        View All Goals
                      </Text>
                      <ArrowRight size={16} color={colors.secondaryForeground} strokeWidth={2.2} />
                    </Pressable>
                  </>
                ) : (
                  <EmptyStateCard
                    title="No goals yet"
                    description="Create a goal to start tracking progress alongside your monthly spending."
                  >
                    <Pressable
                      className="self-start rounded-full px-4 py-2"
                      style={{ backgroundColor: colors.secondary }}
                      onPress={() => router.push('/goals')}
                    >
                      <Text
                        className="text-sm"
                        style={{ color: colors.secondaryForeground, fontFamily: fontFamilies.sans.semibold }}
                      >
                        Create Goal
                      </Text>
                    </Pressable>
                  </EmptyStateCard>
                )}
              </View>
            </SectionCard>

            <SectionCard
              title="Recent Transactions"
              subtitle={
                model.uncategorizedCount > 0
                  ? `${model.uncategorizedCount} uncategorized transaction${model.uncategorizedCount === 1 ? '' : 's'}`
                  : 'Your latest activity from the shared transaction feed.'
              }
            >
              <View className="gap-3">
                {model.recentTransactions.length > 0 ? (
                  <>
                    {model.recentTransactions.map((transaction) => (
                      <TransactionRow
                        key={transaction.id}
                        transaction={transaction}
                        onPress={() => router.push(`/transactions/${transaction.id}` as never)}
                      />
                    ))}
                    <Pressable
                      className="flex-row items-center justify-center gap-2 rounded-[20px] px-4 py-4"
                      style={{ backgroundColor: colors.secondary }}
                      onPress={() => router.push('/transactions')}
                    >
                      <Text
                        className="text-sm"
                        style={{ color: colors.secondaryForeground, fontFamily: fontFamilies.sans.semibold }}
                      >
                        View All Transactions
                      </Text>
                      <ArrowRight size={16} color={colors.secondaryForeground} strokeWidth={2.2} />
                    </Pressable>
                  </>
                ) : (
                  <EmptyStateCard title="No transactions yet" description="Import transactions to bring your dashboard to life.">
                    <Pressable
                      className="self-start flex-row items-center gap-2 rounded-full px-4 py-2"
                      style={{ backgroundColor: colors.secondary }}
                      onPress={() => router.push('/import')}
                    >
                      <DatabaseZap size={16} color={colors.secondaryForeground} strokeWidth={2.2} />
                      <Text
                        className="text-sm"
                        style={{ color: colors.secondaryForeground, fontFamily: fontFamilies.sans.semibold }}
                      >
                        Import Transactions
                      </Text>
                    </Pressable>
                  </EmptyStateCard>
                )}
              </View>
            </SectionCard>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
