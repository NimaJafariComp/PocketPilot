import { Pressable, ScrollView, Text, View } from 'react-native';
import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buildBudgetsViewModel } from '@pocketpilot/core';
import { useData } from '@pocketpilot/services/src/react';
import { AlertBanner } from '@/components/data/alert-banner';
import { AvatarButton } from '@/components/navigation/avatar-button';
import { EmptyStateCard } from '@/components/data/empty-state-card';
import { ProgressSummaryRow } from '@/components/data/progress-summary-row';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { SectionCard } from '@/components/data/section-card';
import { SummaryStrip } from '@/components/data/summary-strip';
import { useAppTheme } from '@/providers/theme-provider';
import { fontFamilies } from '@/theme/tokens';
import { formatCurrency } from '@/lib/format';

function statusLabel(status: 'over' | 'warning' | 'good') {
  return status === 'over' ? 'Over limit' : status === 'warning' ? 'Warning' : 'On track';
}

export default function BudgetsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { budgets, transactions } = useData();
  const { colors, resolvedTheme } = useAppTheme();
  const model = useMemo(() => buildBudgetsViewModel(budgets, transactions), [budgets, transactions]);

  return (
    <Screen atmospheric atmosphericIntensity="medium">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingTop: insets.top + 8, paddingBottom: 19 }}>
        <ScreenHeader
          eyebrow="Budgets"
          title="Budgets"
          subtitle={model.month}
          rightSlot={<AvatarButton />}
        />
        <Pressable
          className="flex-row items-center justify-center gap-2 rounded-[22px] px-4 py-4"
          style={{ backgroundColor: colors.primary }}
          onPress={() => router.push('/budgets/new' as never)}
        >
          <Text
            className="text-sm"
            style={{ color: colors.primaryForeground, fontFamily: fontFamilies.sans.semibold }}
          >
            Create Budget
          </Text>
        </Pressable>

        {model.budgetRows.length > 0 ? (
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
              <Text
                className="text-[34px] tracking-tight"
                style={{ color: colors.foreground, fontFamily: fontFamilies.sans.semibold }}
              >
                {formatCurrency(model.totalSpent)}
              </Text>
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
              {formatCurrency(Math.max(0, model.totalRemaining))} still available across all budgets
            </Text>
            <View className="mt-4 gap-1.5">
              <View className="flex-row justify-between">
                {['0%', `${Math.round(model.totalPct)}% used`, '100%'].map((label) => (
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
                  style={{ width: `${Math.min(model.totalPct, 100)}%`, backgroundColor: colors.primary }}
                />
              </View>
            </View>
          </View>
        ) : null}

        {model.budgetRows.length > 0 ? (
          <SummaryStrip
            items={[
              { label: 'Over limit', value: String(model.overCount), valueColor: model.overCount > 0 ? colors.danger : colors.foreground },
              { label: 'Warning', value: String(model.warningCount) },
              { label: 'On track', value: String(model.goodCount), valueColor: colors.success },
            ]}
          />
        ) : null}

        {model.alertBudgets.map((budget) => (
          <AlertBanner
            key={budget.id}
            tone={budget.status === 'over' ? 'danger' : 'warning'}
            message={
              budget.status === 'over'
                ? `${budget.category} is ${formatCurrency(Math.round(Math.abs(budget.remaining)))} over its ${formatCurrency(Math.round(budget.amount))} limit.`
                : `${budget.category} is at ${Math.round(budget.percentage)}% with ${formatCurrency(Math.round(budget.remaining))} left.`
            }
            actionLabel={budget.status === 'over' ? 'Adjust budget' : 'View'}
            onActionPress={() => router.push(`/budgets/${budget.id}` as never)}
          />
        ))}

        <SectionCard title="All Categories" subtitle="Every monthly budget, sorted by the same status rules as web.">
          <View className="gap-3">
            {model.budgetRows.length > 0 ? (
              model.budgetRows.map((budget) => (
                <Pressable
                  key={budget.id}
                  className="rounded-[26px] border px-4 py-4"
                  style={{
                    backgroundColor: colors.card,
                    borderColor: budget.status === 'over' ? 'rgba(220, 73, 96, 0.28)' : colors.border,
                  }}
                  onPress={() => router.push(`/budgets/${budget.id}` as never)}
                >
                  <View className="flex-row items-center gap-2">
                    <View
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor:
                          budget.status === 'over'
                            ? colors.danger
                            : budget.status === 'warning'
                              ? colors.warning
                              : colors.success,
                      }}
                    />
                    <Text
                      className="text-sm"
                      style={{ color: colors.foreground, fontFamily: fontFamilies.sans.semibold }}
                    >
                      {budget.category}
                    </Text>
                    <View
                      className="rounded-full px-2.5 py-1"
                      style={{
                        backgroundColor:
                          budget.status === 'over'
                            ? 'rgba(220, 73, 96, 0.14)'
                            : budget.status === 'warning'
                              ? 'rgba(213, 155, 47, 0.14)'
                              : 'rgba(31, 157, 114, 0.14)',
                      }}
                    >
                      <Text
                        className="text-[11px]"
                        style={{
                          color:
                            budget.status === 'over'
                              ? colors.danger
                              : budget.status === 'warning'
                                ? colors.warning
                                : colors.success,
                          fontFamily: fontFamilies.sans.medium,
                        }}
                      >
                        {statusLabel(budget.status)}
                      </Text>
                    </View>
                  </View>

                  <View className="mt-4 flex-row items-start gap-4">
                    <View className="flex-1">
                      <ProgressSummaryRow
                        title={budget.status === 'over' ? 'Over by' : 'Remaining'}
                        value={
                          budget.status === 'over'
                            ? formatCurrency(Math.abs(budget.remaining))
                            : formatCurrency(budget.remaining)
                        }
                        progress={Math.min(budget.percentage, 100)}
                        color={
                          budget.status === 'over'
                            ? colors.danger
                            : budget.status === 'warning'
                              ? colors.warning
                              : colors.success
                        }
                        progressLabel={
                          budget.status === 'over'
                            ? `${formatCurrency(Math.round(Math.abs(budget.remaining)))} over ${formatCurrency(Math.round(budget.amount))} budget`
                            : `${formatCurrency(Math.round(budget.spent))} of ${formatCurrency(Math.round(budget.amount))}`
                        }
                      />
                    </View>
                  </View>
                </Pressable>
              ))
            ) : (
              <EmptyStateCard title="No budgets for this month" description="Create your first budget to start tracking category pacing.">
                <Pressable
                  className="self-start rounded-full px-4 py-2"
                  style={{ backgroundColor: colors.secondary }}
                  onPress={() => router.push('/budgets/new' as never)}
                >
                  <Text
                    className="text-sm"
                    style={{ color: colors.secondaryForeground, fontFamily: fontFamilies.sans.semibold }}
                  >
                    Create Your First Budget
                  </Text>
                </Pressable>
              </EmptyStateCard>
            )}
          </View>
        </SectionCard>
      </ScrollView>
    </Screen>
  );
}
