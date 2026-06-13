import { buildBudgetsViewModel } from "@pocketpilot/core";
import { useData } from "@pocketpilot/services/src/react";
import { Stack, useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { AlertBanner } from "@/components/data/alert-banner";
import { hapticSelect } from "@/lib/haptics";
import { ProgressSummaryRow } from "@/components/data/progress-summary-row";
import { SectionCard } from "@/components/data/section-card";
import { SummaryStrip } from "@/components/data/summary-strip";
import { HeaderIconButton } from "@/components/navigation/header-icon-button";
import { Screen } from "@/components/screen";
import { formatCurrency } from "@/lib/format";
import { useTabScrollPadding } from "@/lib/tab-scroll";
import { useAppTheme } from "@/providers/theme-provider";
import { fontFamilies } from "@/theme/tokens";

function statusLabel(status: "over" | "warning" | "good") {
  return status === "over" ? "Over limit" : status === "warning" ? "Warning" : "On track";
}

export default function BudgetsScreen() {
  const router = useRouter();
  const { budgets, transactions } = useData();
  const { colors } = useAppTheme();
  const tabScrollPadding = useTabScrollPadding();
  const model = useMemo(
    () => buildBudgetsViewModel(budgets, transactions),
    [budgets, transactions]
  );

  function statusColor(status: "over" | "warning" | "good") {
    return status === "over"
      ? colors.danger
      : status === "warning"
        ? colors.warning
        : colors.success;
  }

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerRight: () => (
            <HeaderIconButton
              label="Create budget"
              symbol="plus"
              fallback={<Plus size={22} color={colors.tint} strokeWidth={2} />}
              onPress={() => router.push("/budgets/new" as never)}
            />
          ),
        }}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ gap: 24, paddingTop: 16, paddingBottom: tabScrollPadding }}
      >
        {model.budgetRows.length > 0 ? (
          <View className="rounded-xl px-4 py-4" style={{ backgroundColor: colors.card }}>
            <Text
              className="text-[13px]"
              style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
            >
              Spent in {model.month}
            </Text>
            <View className="mt-1 flex-row items-end gap-2">
              <Text
                className="text-[34px] tracking-tight"
                style={{ color: colors.foreground, fontFamily: fontFamilies.sans.bold }}
              >
                {formatCurrency(model.totalSpent)}
              </Text>
              <Text
                className="pb-1.5 text-[15px]"
                style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
              >
                of {formatCurrency(model.totalBudget)}
              </Text>
            </View>
            <View
              className="mt-3 h-2 overflow-hidden rounded-full"
              style={{ backgroundColor: colors.glass }}
            >
              <View
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(model.totalPct, 100)}%`,
                  backgroundColor:
                    model.totalPct >= 100
                      ? colors.danger
                      : model.totalPct >= 80
                        ? colors.warning
                        : colors.success,
                }}
              />
            </View>
            <Text
              className="mt-2 text-[13px]"
              style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
            >
              {formatCurrency(Math.max(0, model.totalRemaining))} remaining •{" "}
              {Math.round(model.totalPct)}% used
            </Text>
          </View>
        ) : null}

        {model.budgetRows.length > 0 ? (
          <SummaryStrip
            items={[
              {
                label: "Over limit",
                value: String(model.overCount),
                valueColor: model.overCount > 0 ? colors.danger : colors.foreground,
              },
              { label: "Warning", value: String(model.warningCount) },
              { label: "On track", value: String(model.goodCount), valueColor: colors.success },
            ]}
          />
        ) : null}

        {model.alertBudgets.length > 0 ? (
          <View className="gap-2">
            {model.alertBudgets.map((budget) => (
              <AlertBanner
                key={budget.id}
                tone={budget.status === "over" ? "danger" : "warning"}
                message={
                  budget.status === "over"
                    ? `${budget.category} is ${formatCurrency(Math.round(Math.abs(budget.remaining)))} over its ${formatCurrency(Math.round(budget.amount))} limit.`
                    : `${budget.category} is at ${Math.round(budget.percentage)}% with ${formatCurrency(Math.round(budget.remaining))} left.`
                }
                actionLabel="View"
                onActionPress={() => router.push(`/budgets/${budget.id}` as never)}
              />
            ))}
          </View>
        ) : null}

        <SectionCard title={`All categories (${model.budgetRows.length})`}>
          {model.budgetRows.length > 0 ? (
            <View>
              {model.budgetRows.map((budget, index) => (
                <Pressable
                  key={budget.id}
                  onPress={() => { hapticSelect(); router.push(`/budgets/${budget.id}` as never); }}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                >
                  <View className="gap-2 py-3">
                    <View className="flex-row items-center gap-2">
                      <View
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: statusColor(budget.status) }}
                      />
                      <Text
                        className="flex-1 text-[16px]"
                        style={{ color: colors.foreground, fontFamily: fontFamilies.sans.medium }}
                      >
                        {budget.category}
                      </Text>
                      <Text
                        className="text-[13px]"
                        style={{
                          color: statusColor(budget.status),
                          fontFamily: fontFamilies.sans.medium,
                        }}
                      >
                        {statusLabel(budget.status)}
                      </Text>
                    </View>
                    <ProgressSummaryRow
                      title={budget.status === "over" ? "Over by" : "Remaining"}
                      value={
                        budget.status === "over"
                          ? formatCurrency(Math.abs(budget.remaining))
                          : formatCurrency(budget.remaining)
                      }
                      progress={Math.min(budget.percentage, 100)}
                      color={statusColor(budget.status)}
                      progressLabel={`${formatCurrency(Math.round(budget.spent))} of ${formatCurrency(Math.round(budget.amount))}`}
                    />
                  </View>
                  {index < model.budgetRows.length - 1 ? (
                    <View className="h-px" style={{ backgroundColor: colors.border }} />
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : (
            <View className="items-center py-4">
              <Text
                className="text-center text-[15px] leading-5"
                style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
              >
                No budgets for this month yet.
              </Text>
              <Pressable onPress={() => router.push("/budgets/new" as never)} hitSlop={6}>
                <Text
                  className="mt-2 text-[16px]"
                  style={{ color: colors.tint, fontFamily: fontFamilies.sans.medium }}
                >
                  Create Your First Budget
                </Text>
              </Pressable>
            </View>
          )}
        </SectionCard>
      </ScrollView>
    </Screen>
  );
}
