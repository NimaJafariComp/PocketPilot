import { Pressable, ScrollView, Text, View } from 'react-native';
import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buildGoalsViewModel } from '@pocketpilot/core';
import { useData } from '@pocketpilot/services/src/react';
import { HeaderActions } from '@/components/navigation/header-actions';
import { EmptyStateCard } from '@/components/data/empty-state-card';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { SectionCard } from '@/components/data/section-card';
import { SummaryStrip } from '@/components/data/summary-strip';
import { Sparkline } from '@/components/charts/sparkline';
import { useAppTheme } from '@/providers/theme-provider';
import { fontFamilies } from '@/theme/tokens';
import { formatCurrency, formatShortDate } from '@/lib/format';
import { FittedValueText } from '@/components/data/fitted-value-text';

export default function GoalsScreen() {
  const router = useRouter();
  const { goals } = useData();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { goalPalette } = colors;
  const model = useMemo(() => buildGoalsViewModel(goals), [goals]);

  return (
    <Screen atmospheric atmosphericIntensity="medium">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 16, paddingTop: 8, paddingBottom: Math.max(160, insets.bottom + 32) }}
      >
        <ScreenHeader
          eyebrow="Goals"
          title="Savings Goals"
          subtitle="Track your progress toward meaningful financial milestones."
          rightSlot={<HeaderActions />}
        />
        <Pressable
          className="flex-row items-center justify-center gap-2 rounded-[22px] px-4 py-4"
          style={{ backgroundColor: colors.primary }}
          onPress={() => router.push('/goals/new' as never)}
        >
          <Text
            className="text-sm"
            style={{ color: colors.primaryForeground, fontFamily: fontFamilies.sans.semibold }}
          >
            Create Goal
          </Text>
        </Pressable>

        {goals.length > 0 ? (
          <SummaryStrip
            eyebrow="Goals"
            tone="goals"
            items={[
              { label: 'Total Saved', value: formatCurrency(model.totalSaved), detail: `Across ${goals.length} goals` },
              {
                label: 'Still Needed',
                value: formatCurrency(model.totalNeeded),
                detail: 'To reach every target',
                valueColor: goalPalette.stroke,
              },
              { label: 'Completed', value: String(model.completedCount), detail: `Of ${goals.length} total goals`, valueColor: colors.success },
            ]}
          />
        ) : null}

        <SectionCard
          title="All Goals"
          subtitle="The same progress, deadline, and contribution context from the web app, adapted for mobile cards."
          eyebrow="Goals"
          tone="goals"
          badge={`${goals.length} active`}
        >
          <View className="gap-4">
            {model.goalRows.length > 0 ? (
              model.goalRows.map(({ goal, percentage, isComplete, remaining, chartData }) => (
                <View
                  key={goal.id}
                  className="overflow-hidden rounded-[28px] border"
                  style={{ backgroundColor: colors.card, borderColor: colors.border }}
                >
                  <View
                    className="h-1"
                    style={{ backgroundColor: isComplete ? goalPalette.complete : goalPalette.stroke }}
                  />
                  <View className="gap-4 px-4 py-4">
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <Text
                          className="text-lg tracking-tight"
                          style={{ color: colors.foreground, fontFamily: fontFamilies.serif.semibold }}
                        >
                          {goal.name}
                        </Text>
                        <Text
                          className="mt-1 text-xs leading-5"
                          style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
                        >
                          {goal.deadline
                            ? `${isComplete ? 'Completed' : 'Due'} ${formatShortDate(goal.deadline)}`
                            : 'No deadline set'}
                        </Text>
                      </View>
                      <View
                        className="rounded-full px-2.5 py-1"
                        style={{ backgroundColor: isComplete ? colors.sectionAccents.goals.chipBackground : goalPalette.chipBackground }}
                      >
                        <Text
                          className="text-[11px]"
                          style={{
                            color: isComplete ? goalPalette.complete : goalPalette.chipColor,
                            fontFamily: fontFamilies.sans.medium,
                          }}
                        >
                          {isComplete ? 'Complete' : `${Math.round(percentage)}%`}
                        </Text>
                      </View>
                    </View>

                    <View>
                      <View className="flex-row items-baseline gap-1.5">
                        <FittedValueText
                          className="text-[28px] tracking-tight"
                          style={{
                            color: isComplete ? goalPalette.complete : goalPalette.stroke,
                            fontFamily: fontFamilies.sans.semibold,
                          }}
                        >
                          {formatCurrency(goal.currentAmount)}
                        </FittedValueText>
                        <Text
                          className="text-sm"
                          style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
                        >
                          / {formatCurrency(goal.targetAmount)}
                        </Text>
                      </View>
                      <View className="mt-3 h-2 overflow-hidden rounded-full" style={{ backgroundColor: colors.muted }}>
                        <View
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(percentage, 100)}%`,
                            backgroundColor: isComplete ? goalPalette.complete : goalPalette.progress,
                          }}
                        />
                      </View>
                      <View className="mt-2 flex-row justify-between">
                        <Text
                          className="text-xs"
                          style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
                        >
                          $0
                        </Text>
                        <Text
                          className="text-xs"
                          style={{
                            color: isComplete ? goalPalette.complete : goalPalette.stroke,
                            fontFamily: fontFamilies.sans.medium,
                          }}
                        >
                          {isComplete ? 'Goal reached' : `${formatCurrency(remaining)} remaining`}
                        </Text>
                      </View>
                    </View>

                    {chartData.length > 1 ? (
                      <View>
                        <Text
                          className="mb-2 text-[11px] uppercase tracking-[1.6px]"
                          style={{ color: goalPalette.chipColor, fontFamily: fontFamilies.sans.medium }}
                        >
                          Progress Over Time
                        </Text>
                        <Sparkline
                          points={chartData}
                          color={isComplete ? goalPalette.complete : goalPalette.stroke}
                          fillColor={isComplete ? colors.sectionAccents.goals.chipBackground : goalPalette.fill}
                        />
                      </View>
                    ) : null}

                    {goal.contributions.length > 0 ? (
                      <View className="border-t pt-3" style={{ borderColor: colors.border }}>
                        <Text
                          className="mb-2 text-[11px] uppercase tracking-[1.6px]"
                          style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.medium }}
                        >
                          Recent Contributions
                        </Text>
                        <View className="gap-2">
                          {[...goal.contributions]
                            .reverse()
                            .slice(0, 3)
                            .map((contribution) => (
                              <View key={contribution.id} className="flex-row justify-between gap-3">
                                <Text
                                  className="text-sm"
                                  style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
                                >
                                  {formatShortDate(contribution.date)}
                                </Text>
                                <Text
                                  className="text-sm"
                                  style={{ color: goalPalette.complete, fontFamily: fontFamilies.sans.semibold }}
                                >
                                  +{formatCurrency(contribution.amount)}
                                </Text>
                              </View>
                            ))}
                        </View>
                      </View>
                    ) : null}

                    <Pressable
                      className="rounded-[20px] px-4 py-4"
                      style={{
                        backgroundColor: isComplete ? colors.secondary : goalPalette.stroke,
                        opacity: isComplete ? 0.8 : 1,
                      }}
                      disabled={isComplete}
                      onPress={() => router.push(`/goals/${goal.id}/contribute` as never)}
                    >
                      <Text
                        className="text-center text-sm"
                        style={{
                          color: isComplete ? colors.secondaryForeground : colors.primaryForeground,
                          fontFamily: fontFamilies.sans.semibold,
                        }}
                      >
                        {isComplete ? 'Goal Reached' : '+ Add Contribution'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))
            ) : (
              <EmptyStateCard title="No active goals" description="Create your first goal to start tracking savings progress.">
                <Pressable
                  className="self-start rounded-full px-4 py-2"
                  style={{ backgroundColor: colors.secondary }}
                  onPress={() => router.push('/goals/new' as never)}
                >
                  <Text
                    className="text-sm"
                    style={{ color: colors.secondaryForeground, fontFamily: fontFamilies.sans.semibold }}
                  >
                    Create Your First Goal
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
