import { useData } from "@pocketpilot/services/src/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { ProgressSummaryRow } from "@/components/data/progress-summary-row";
import { FormField } from "@/components/forms/form-field";
import { FormScreen } from "@/components/forms/form-screen";
import { mobileServices } from "@/config/services";
import { formatCurrency } from "@/lib/format";
import { useAppTheme } from "@/providers/theme-provider";
import { fontFamilies } from "@/theme/tokens";

export default function GoalContributionScreen() {
  const router = useRouter();
  const { goalId } = useLocalSearchParams<{ goalId: string }>();
  const { goals, updateGoal } = useData();
  const { colors } = useAppTheme();
  const [amount, setAmount] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const goal = useMemo(() => goals.find((item) => item.id === goalId), [goalId, goals]);

  async function handleSave() {
    if (!goal || isSaving) {
      return;
    }

    const contributionAmount = Number.parseFloat(amount);
    if (Number.isNaN(contributionAmount) || contributionAmount <= 0) {
      await mobileServices.dialog.alert(
        "Enter a valid contribution amount greater than 0.",
        "Invalid amount"
      );
      return;
    }

    try {
      setIsSaving(true);
      await updateGoal(goal.id, {
        currentAmount: goal.currentAmount + contributionAmount,
        contributions: [
          ...goal.contributions,
          {
            id: Date.now().toString(),
            amount: contributionAmount,
            date: new Date().toISOString(),
          },
        ],
      });
      router.replace("/goals");
    } catch (error) {
      await mobileServices.dialog.alert(
        error instanceof Error ? error.message : "Failed to add the contribution.",
        "Save failed"
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <FormScreen
      footer={
        goal ? (
          <View className="flex-row gap-3">
            <Pressable
              className="flex-1 rounded-xl px-4 py-4"
              style={{ backgroundColor: colors.secondary }}
              onPress={() => router.back()}
            >
              <Text
                className="text-center text-[16px]"
                style={{
                  color: colors.secondaryForeground,
                  fontFamily: fontFamilies.sans.semibold,
                }}
              >
                Cancel
              </Text>
            </Pressable>
            <Pressable
              className="flex-1 rounded-xl px-4 py-4"
              style={{ backgroundColor: colors.primary, opacity: isSaving ? 0.65 : 1 }}
              onPress={handleSave}
              disabled={isSaving}
            >
              <Text
                className="text-center text-[16px]"
                style={{ color: colors.primaryForeground, fontFamily: fontFamilies.sans.semibold }}
              >
                {isSaving ? "Saving..." : `Add ${amount ? `$${amount}` : "Contribution"}`}
              </Text>
            </Pressable>
          </View>
        ) : null
      }
    >
      {goal ? (
        <>
          <ProgressSummaryRow
            title={goal.name}
            value={`${formatCurrency(goal.currentAmount)} / ${formatCurrency(goal.targetAmount)}`}
            progress={goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0}
            progressLabel={`${formatCurrency(Math.max(0, goal.targetAmount - goal.currentAmount))} to go`}
          />
          <FormField label="Contribution Amount">
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="100.00"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              className="rounded-xl border px-4 py-4 text-base"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.card,
                color: colors.foreground,
                fontFamily: fontFamilies.sans.regular,
              }}
            />
          </FormField>
        </>
      ) : (
        <Text style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}>
          Return to goals and choose another item.
        </Text>
      )}
    </FormScreen>
  );
}
