import type { Category } from "@pocketpilot/core";
import { Pressable, Text, TextInput, View } from "react-native";
import { FormField } from "@/components/forms/form-field";
import { useAppTheme } from "@/providers/theme-provider";
import { fontFamilies } from "@/theme/tokens";

export interface TransactionDraft {
  date: string;
  merchant: string;
  amount: string;
  type: "expense" | "income";
  category: string;
  notes: string;
}

interface TransactionEditorFieldsProps {
  categories: Category[];
  draft: TransactionDraft;
  setDraft: (updater: (current: TransactionDraft) => TransactionDraft) => void;
}

export function TransactionEditorFields({
  categories,
  draft,
  setDraft,
}: TransactionEditorFieldsProps) {
  const { colors } = useAppTheme();
  const inputStyle = {
    borderColor: colors.border,
    backgroundColor: colors.card,
    color: colors.foreground,
    fontFamily: fontFamilies.sans.regular,
  } as const;

  return (
    <View className="gap-3">
      <View className="flex-row gap-2.5">
        <View className="flex-1">
          <FormField label="Date" hint="Use YYYY-MM-DD.">
            <TextInput
              value={draft.date}
              onChangeText={(value) => setDraft((current) => ({ ...current, date: value }))}
              placeholder="2026-04-07"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              className="rounded-lg border px-3.5 py-3 text-sm"
              style={inputStyle}
            />
          </FormField>
        </View>
        <View className="flex-1">
          <FormField label="Amount" hint="Enter a positive amount.">
            <TextInput
              value={draft.amount}
              onChangeText={(value) => setDraft((current) => ({ ...current, amount: value }))}
              placeholder="0.00"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              className="rounded-lg border px-3.5 py-3 text-sm"
              style={inputStyle}
            />
          </FormField>
        </View>
      </View>

      <FormField label="Type">
        <View className="flex-row gap-2">
          {(["expense", "income"] as const).map((value) => {
            const active = draft.type === value;
            return (
              <Pressable
                key={value}
                className="flex-1 rounded-full px-4 py-2.5"
                style={{ backgroundColor: active ? colors.primary : colors.secondary }}
                onPress={() => setDraft((current) => ({ ...current, type: value }))}
              >
                <Text
                  className="text-center text-xs"
                  style={{
                    color: active ? colors.primaryForeground : colors.secondaryForeground,
                    fontFamily: fontFamilies.sans.semibold,
                  }}
                >
                  {value === "expense" ? "Expense" : "Income"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </FormField>

      <FormField label="Merchant">
        <TextInput
          value={draft.merchant}
          onChangeText={(value) => setDraft((current) => ({ ...current, merchant: value }))}
          placeholder="Whole Foods"
          placeholderTextColor={colors.mutedForeground}
          className="rounded-lg border px-3.5 py-3 text-sm"
          style={inputStyle}
        />
      </FormField>

      <FormField label="Category">
        <View className="flex-row flex-wrap gap-1.5">
          {categories.map((category) => {
            const active = draft.category === category.name;
            return (
              <Pressable
                key={category.id}
                className="rounded-full px-2.5 py-1.5"
                style={{ backgroundColor: active ? colors.primary : colors.secondary }}
                onPress={() => setDraft((current) => ({ ...current, category: category.name }))}
              >
                <Text
                  className="text-xs"
                  style={{
                    color: active ? colors.primaryForeground : colors.secondaryForeground,
                    fontFamily: fontFamilies.sans.medium,
                  }}
                >
                  {category.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </FormField>

      <FormField label="Notes" hint="Add any detail that helps you remember the context.">
        <TextInput
          value={draft.notes}
          onChangeText={(value) => setDraft((current) => ({ ...current, notes: value }))}
          placeholder="Location, time, receipt details, or any context"
          placeholderTextColor={colors.mutedForeground}
          multiline
          textAlignVertical="top"
          className="min-h-[88px] rounded-lg border px-3.5 py-3 text-sm"
          style={inputStyle}
        />
      </FormField>
    </View>
  );
}
