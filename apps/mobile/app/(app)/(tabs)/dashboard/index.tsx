import { Pressable, ScrollView, Text, View } from 'react-native';
import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ChevronRight, Sparkles, Upload } from 'lucide-react-native';
import {
  buildDashboardViewModel,
  generateSampleBudgets,
  generateSampleGoals,
  generateSampleTransactions,
} from '@pocketpilot/core';
import { useData } from '@pocketpilot/services/src/react';
import { AlertBanner } from '@/components/data/alert-banner';
import { EmptyStateCard } from '@/components/data/empty-state-card';
import { ProgressSummaryRow } from '@/components/data/progress-summary-row';
import { Screen } from '@/components/screen';
import { useTabScrollPadding } from '@/lib/tab-scroll';
import { SectionCard } from '@/components/data/section-card';
import { TransactionRow } from '@/components/transactions/transaction-row';
import { VerticalBarChart } from '@/components/charts/vertical-bar-chart';
import { useAppTheme } from '@/providers/theme-provider';
import { mobileServices } from '@/config/services';
import { fontFamilies } from '@/theme/tokens';
import { formatCurrency } from '@/lib/format';
import { hapticSuccess } from '@/lib/haptics';
import { FittedValueText } from '@/components/data/fitted-value-text';
import type { ReactNode } from 'react';

function PrimaryButton({
  label,
  icon,
  onPress,
  disabled,
  variant = 'filled',
}: {
  label: string;
  icon?: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'filled' | 'gray';
}) {
  const { colors } = useAppTheme();
  const filled = variant === 'filled';

  return (
    <Pressable
      className="flex-1 flex-row items-center justify-center gap-2 rounded-xl px-4 py-3.5"
      style={{
        backgroundColor: filled ? colors.primary : colors.glass,
        opacity: disabled ? 0.6 : 1,
      }}
      onPress={onPress}
      disabled={disabled}
    >
      {icon}
      <Text
        className="text-[16px]"
        style={{
          color: filled ? colors.primaryForeground : colors.tint,
          fontFamily: fontFamilies.sans.semibold,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ViewAllRow({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      className="flex-row items-center justify-between py-3"
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <Text className="text-[16px]" style={{ color: colors.tint, fontFamily: fontFamilies.sans.regular }}>
        {label}
      </Text>
      <ChevronRight size={17} color={colors.mutedForeground} strokeWidth={2} />
    </Pressable>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { transactions, budgets, goals, loading, importTransactions, addBudget, addGoal } = useData();
  const { colors } = useAppTheme();
  const tabScrollPadding = useTabScrollPadding();
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

      hapticSuccess();
      await mobileServices.dialog.alert(
        'Sample data is ready. Explore transactions, budgets, goals, and insights across the mobile app.',
        'Workspace loaded',
      );
    } finally {
      setIsLoadingSampleData(false);
    }
  }

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ gap: 24, paddingTop: 16, paddingBottom: tabScrollPadding }}
      >
        {loading ? (
          <EmptyStateCard
            title="Loading dashboard"
            description="Syncing transactions, budgets, and goals."
          />
        ) : model.hasNoData ? (
          <>
            <View className="rounded-xl px-4 py-5" style={{ backgroundColor: colors.card }}>
              <Text
                className="text-[22px] tracking-tight"
                style={{ color: colors.foreground, fontFamily: fontFamilies.sans.bold }}
              >
                Welcome to PocketPilot
              </Text>
              <Text
                className="mt-1 text-[15px] leading-5"
                style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
              >
                Import transactions, set budgets, track goals, and get insights. Supports CSV, OFX, QFX, and QBO files.
              </Text>

              <View className="mt-5 flex-row gap-3">
                <PrimaryButton
                  label="Import"
                  icon={<Upload size={17} color={colors.primaryForeground} strokeWidth={2} />}
                  onPress={() => router.push('/import')}
                />
                <PrimaryButton
                  label={isLoadingSampleData ? 'Loading…' : 'Try Sample Data'}
                  icon={<Sparkles size={17} color={colors.tint} strokeWidth={2} />}
                  onPress={handleLoadSampleData}
                  disabled={isLoadingSampleData}
                  variant="gray"
                />
              </View>
            </View>

            <SectionCard title="Getting started">
              <View>
                {[
                  { step: '1', title: 'Import', description: 'Upload a CSV or load a sample workspace.', last: false },
                  { step: '2', title: 'Categorize', description: 'Review AI-sorted merchants and adjust edge cases.', last: false },
                  { step: '3', title: 'Understand', description: 'Use budgets, goals, and insights to plan ahead.', last: true },
                ].map((item) => (
                  <View key={item.step}>
                    <View className="flex-row items-center gap-3 py-3">
                      <View
                        className="h-7 w-7 items-center justify-center rounded-full"
                        style={{ backgroundColor: colors.primary }}
                      >
                        <Text
                          className="text-[13px]"
                          style={{ color: colors.primaryForeground, fontFamily: fontFamilies.sans.semibold }}
                        >
                          {item.step}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text
                          className="text-[16px]"
                          style={{ color: colors.foreground, fontFamily: fontFamilies.sans.medium }}
                        >
                          {item.title}
                        </Text>
                        <Text
                          className="mt-0.5 text-[13px] leading-4"
                          style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
                        >
                          {item.description}
                        </Text>
                      </View>
                    </View>
                    {!item.last ? <View className="ml-10 h-px" style={{ backgroundColor: colors.border }} /> : null}
                  </View>
                ))}
              </View>
            </SectionCard>
          </>
        ) : (
          <>
            {model.alerts.length > 0 ? (
              <View className="gap-2">
                {model.alerts.map((alert) => {
                  if (alert.kind === 'over-budget') {
                    return (
                      <AlertBanner
                        key={alert.kind}
                        tone="danger"
                        message={`Over budget by ${formatCurrency(Math.round(alert.value))} this month.`}
                        actionLabel="Review"
                        onActionPress={() => router.push('/budgets')}
                      />
                    );
                  }

                  if (alert.kind === 'warning') {
                    return (
                      <AlertBanner
                        key={alert.kind}
                        tone="warning"
                        message={`${Math.round(model.budgetPct)}% of budget used, ${formatCurrency(Math.round(alert.value))} left.`}
                        actionLabel="View"
                        onActionPress={() => router.push('/budgets')}
                      />
                    );
                  }

                  return (
                    <AlertBanner
                      key={alert.kind}
                      tone="neutral"
                      message={`${alert.value} transaction${alert.value === 1 ? '' : 's'} need categorizing.`}
                      actionLabel="Review"
                      onActionPress={() => router.push('/transactions')}
                    />
                  );
                })}
              </View>
            ) : null}

            {model.totalBudget > 0 ? (
              <View className="rounded-xl px-4 py-4" style={{ backgroundColor: colors.card }}>
                <Text
                  className="text-[13px]"
                  style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
                >
                  Spent this month
                </Text>
                <View className="mt-1 flex-row items-end gap-2">
                  <FittedValueText
                    className="text-[34px] tracking-tight"
                    style={{ color: colors.foreground, fontFamily: fontFamilies.sans.bold }}
                  >
                    {formatCurrency(model.totalSpent)}
                  </FittedValueText>
                  <Text
                    className="pb-1.5 text-[15px]"
                    style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
                  >
                    of {formatCurrency(model.totalBudget)}
                  </Text>
                </View>

                <View className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: colors.glass }}>
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
                <Text
                  className="mt-2 text-[13px]"
                  style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
                >
                  {model.remaining >= 0
                    ? `${formatCurrency(Math.round(model.remaining))} remaining`
                    : `${formatCurrency(Math.round(Math.abs(model.remaining)))} over budget`}
                </Text>

                <View className="mt-4 h-px" style={{ backgroundColor: colors.border }} />

                <View className="mt-3 flex-row">
                  <View className="flex-1">
                    <Text
                      className="text-[13px]"
                      style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
                    >
                      Income
                    </Text>
                    <FittedValueText
                      className="mt-0.5 text-[20px]"
                      style={{ color: colors.success, fontFamily: fontFamilies.sans.semibold }}
                    >
                      {formatCurrency(model.totalIncome)}
                    </FittedValueText>
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-[13px]"
                      style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
                    >
                      Remaining
                    </Text>
                    <FittedValueText
                      className="mt-0.5 text-[20px]"
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

            <SectionCard title="Top spending categories">
              <VerticalBarChart data={model.topCategories} emptyLabel="No spending data yet" />
            </SectionCard>

            <SectionCard title="Goals">
              {model.goalProgress.length > 0 ? (
                <View>
                  <View className="gap-4 py-1">
                    {model.goalProgress.map((goal) => (
                      <ProgressSummaryRow
                        key={goal.id}
                        title={goal.name}
                        value={`${formatCurrency(goal.currentAmount)} / ${formatCurrency(goal.targetAmount)}`}
                        progress={goal.percentage}
                        progressLabel={`${Math.round(goal.percentage)}% funded`}
                      />
                    ))}
                  </View>
                  <View className="mt-2 h-px" style={{ backgroundColor: colors.border }} />
                  <ViewAllRow label="View All Goals" onPress={() => router.push('/goals')} />
                </View>
              ) : (
                <View className="py-2">
                  <Text
                    className="text-[15px] leading-5"
                    style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
                  >
                    No goals yet. Create one to track savings progress.
                  </Text>
                  <Pressable onPress={() => router.push('/goals')} hitSlop={6}>
                    <Text
                      className="mt-2 text-[16px]"
                      style={{ color: colors.tint, fontFamily: fontFamilies.sans.regular }}
                    >
                      Create Goal
                    </Text>
                  </Pressable>
                </View>
              )}
            </SectionCard>

            <SectionCard
              title="Recent transactions"
              subtitle={
                model.uncategorizedCount > 0
                  ? `${model.uncategorizedCount} uncategorized transaction${model.uncategorizedCount === 1 ? '' : 's'}.`
                  : undefined
              }
            >
              {model.recentTransactions.length > 0 ? (
                <View>
                  {model.recentTransactions.map((transaction) => (
                    <TransactionRow
                      key={transaction.id}
                      transaction={transaction}
                      separator
                      onPress={() => router.push(`/transactions/${transaction.id}` as never)}
                    />
                  ))}
                  <ViewAllRow label="View All Transactions" onPress={() => router.push('/transactions')} />
                </View>
              ) : (
                <View className="py-2">
                  <Text
                    className="text-[15px] leading-5"
                    style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
                  >
                    No transactions yet. Import a file to get started.
                  </Text>
                  <Pressable onPress={() => router.push('/import')} hitSlop={6}>
                    <Text
                      className="mt-2 text-[16px]"
                      style={{ color: colors.tint, fontFamily: fontFamilies.sans.regular }}
                    >
                      Import Transactions
                    </Text>
                  </Pressable>
                </View>
              )}
            </SectionCard>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
