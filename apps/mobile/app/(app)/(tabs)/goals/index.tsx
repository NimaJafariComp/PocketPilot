import { Pressable, ScrollView, Text, View } from 'react-native';
import { useMemo } from 'react';
import { Stack, useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { buildGoalsViewModel } from '@pocketpilot/core';
import { useData } from '@pocketpilot/services/src/react';
import { EmptyStateCard } from '@/components/data/empty-state-card';
import { Screen } from '@/components/screen';
import { HeaderIconButton } from '@/components/navigation/header-icon-button';
import { useTabScrollPadding } from '@/lib/tab-scroll';
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
  const tabScrollPadding = useTabScrollPadding();
  const { goalPalette } = colors;
  const model = useMemo(() => buildGoalsViewModel(goals), [goals]);

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerRight: () => (
            <HeaderIconButton
              label="Create goal"
              symbol="plus"
              fallback={<Plus size={22} color={colors.tint} strokeWidth={2} />}
              onPress={() => router.push('/goals/new' as never)}
            />
          ),
        }}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ gap: 16, paddingTop: 16, paddingBottom: tabScrollPadding }}
      >
        {goals.length > 0 ? (
          <SummaryStrip
            items={[
              { label: 'Saved', value: formatCurrency(model.totalSaved) },
              { label: 'Needed', value: formatCurrency(model.totalNeeded), valueColor: goalPalette.stroke },
              { label: 'Done', value: `${model.completedCount}/${goals.length}`, valueColor: colors.success },
            ]}
          />
        ) : null}

        {model.goalRows.length > 0 ? (
          model.goalRows.map(({ goal, percentage, isComplete, remaining, chartData }) => (
            <View key={goal.id} className="rounded-xl px-4 py-4" style={{ backgroundColor: colors.card }}>
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text
                    className="text-[17px] tracking-tight"
                    style={{ color: colors.foreground, fontFamily: fontFamilies.sans.semibold }}
                  >
                    {goal.name}
                  </Text>
                  <Text
                    className="mt-0.5 text-[13px]"
                    style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
                  >
                    {goal.deadline
                      ? `${isComplete ? 'Completed' : 'Due'} ${formatShortDate(goal.deadline)}`
                      : 'No deadline'}
                  </Text>
                </View>
                <View
                  className="rounded-full px-2.5 py-1"
                  style={{ backgroundColor: isComplete ? colors.sectionAccents.goals.chipBackground : goalPalette.chipBackground }}
                >
                  <Text
                    className="text-[12px]"
                    style={{
                      color: isComplete ? colors.success : goalPalette.chipColor,
                      fontFamily: fontFamilies.sans.medium,
                    }}
                  >
                    {isComplete ? 'Complete' : `${Math.round(percentage)}%`}
                  </Text>
                </View>
              </View>

              <View className="mt-3">
                <View className="flex-row items-baseline gap-1.5">
                  <FittedValueText
                    className="text-[24px] tracking-tight"
                    style={{
                      color: colors.foreground,
                      fontFamily: fontFamilies.sans.semibold,
                    }}
                  >
                    {formatCurrency(goal.currentAmount)}
                  </FittedValueText>
                  <Text
                    className="text-[14px]"
                    style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
                  >
                    of {formatCurrency(goal.targetAmount)}
                  </Text>
                </View>
                <View className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: colors.glass }}>
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(percentage, 100)}%`,
                      backgroundColor: isComplete ? goalPalette.complete : goalPalette.progress,
                    }}
                  />
                </View>
                <Text
                  className="mt-2 text-[13px]"
                  style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
                >
                  {isComplete ? 'Goal reached' : `${formatCurrency(remaining)} to go`}
                </Text>
              </View>

              {chartData.length > 1 ? (
                <View className="mt-3">
                  <Sparkline
                    points={chartData}
                    color={isComplete ? goalPalette.complete : goalPalette.stroke}
                    fillColor={isComplete ? colors.sectionAccents.goals.chipBackground : goalPalette.fill}
                  />
                </View>
              ) : null}

              {goal.contributions.length > 0 ? (
                <View className="mt-3 border-t pt-3" style={{ borderColor: colors.border }}>
                  <Text
                    className="mb-1 text-[13px]"
                    style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
                  >
                    Recent contributions
                  </Text>
                  <View className="gap-1.5">
                    {[...goal.contributions]
                      .reverse()
                      .slice(0, 3)
                      .map((contribution) => (
                        <View key={contribution.id} className="flex-row justify-between gap-3">
                          <Text
                            className="text-[14px]"
                            style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
                          >
                            {formatShortDate(contribution.date)}
                          </Text>
                          <Text
                            className="text-[14px]"
                            style={{ color: colors.success, fontFamily: fontFamilies.sans.semibold }}
                          >
                            +{formatCurrency(contribution.amount)}
                          </Text>
                        </View>
                      ))}
                  </View>
                </View>
              ) : null}

              {!isComplete ? (
                <Pressable
                  className="mt-4 rounded-xl px-4 py-3"
                  style={({ pressed }) => ({ backgroundColor: colors.glass, opacity: pressed ? 0.6 : 1 })}
                  onPress={() => router.push(`/goals/${goal.id}/contribute` as never)}
                >
                  <Text
                    className="text-center text-[16px]"
                    style={{ color: colors.tint, fontFamily: fontFamilies.sans.semibold }}
                  >
                    Add Contribution
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ))
        ) : (
          <EmptyStateCard title="No active goals" description="Create your first goal to start tracking savings progress.">
            <Pressable onPress={() => router.push('/goals/new' as never)} hitSlop={6}>
              <Text
                className="text-[16px]"
                style={{ color: colors.tint, fontFamily: fontFamilies.sans.regular }}
              >
                Create Your First Goal
              </Text>
            </Pressable>
          </EmptyStateCard>
        )}
      </ScrollView>
    </Screen>
  );
}
