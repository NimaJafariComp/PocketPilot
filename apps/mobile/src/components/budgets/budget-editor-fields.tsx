import { Pressable, Text, TextInput, View } from 'react-native';
import { useAppTheme } from '@/providers/theme-provider';
import { fontFamilies } from '@/theme/tokens';
import { FormField } from '@/components/forms/form-field';
import { formatCurrency } from '@/lib/format';
import type { Category } from '@pocketpilot/core';

export interface BudgetDraft {
  category: string;
  amount: string;
  month: string;
  warningThreshold: number;
  limitThreshold: number;
}

interface BudgetEditorFieldsProps {
  categories: Category[];
  draft: BudgetDraft;
  setDraft: (updater: (current: BudgetDraft) => BudgetDraft) => void;
}

export function BudgetEditorFields({ categories, draft, setDraft }: BudgetEditorFieldsProps) {
  const { colors } = useAppTheme();
  const inputStyle = {
    borderColor: colors.border,
    backgroundColor: colors.card,
    color: colors.foreground,
    fontFamily: fontFamilies.sans.regular,
  } as const;

  const filteredCategories = categories.filter(
    (category) => category.name !== 'Uncategorized' && category.name !== 'Income',
  );
  const budgetAmount = Number.parseFloat(draft.amount) || 0;

  return (
    <>
      <FormField label="Category">
        <View className="flex-row flex-wrap gap-2">
          {filteredCategories.map((category) => {
            const active = draft.category === category.name;
            return (
              <Pressable
                key={category.id}
                className="rounded-full px-3 py-2"
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

      <FormField label="Budget Amount">
        <TextInput
          value={draft.amount}
          onChangeText={(value) => setDraft((current) => ({ ...current, amount: value }))}
          placeholder="500.00"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="decimal-pad"
          className="rounded-[20px] border px-4 py-4 text-base"
          style={inputStyle}
        />
      </FormField>

      <FormField label="Month" hint="Use YYYY-MM.">
        <TextInput
          value={draft.month}
          onChangeText={(value) => setDraft((current) => ({ ...current, month: value }))}
          placeholder="2026-04"
          placeholderTextColor={colors.mutedForeground}
          className="rounded-[20px] border px-4 py-4 text-base"
          style={inputStyle}
        />
      </FormField>

      <FormField
        label="Warning Threshold"
        hint={
          budgetAmount > 0
            ? `Warn me at ${formatCurrency(Math.round((budgetAmount * draft.warningThreshold) / 100))}.`
            : 'Choose when a budget should move into warning.'
        }
      >
        <View className="flex-row flex-wrap gap-2">
          {[50, 60, 70, 80, 90, 100].map((value) => {
            const active = draft.warningThreshold === value;
            return (
              <Pressable
                key={value}
                className="rounded-full px-3 py-2"
                style={{ backgroundColor: active ? colors.primary : colors.secondary }}
                onPress={() => setDraft((current) => ({ ...current, warningThreshold: value }))}
              >
                <Text
                  className="text-xs"
                  style={{
                    color: active ? colors.primaryForeground : colors.secondaryForeground,
                    fontFamily: fontFamilies.sans.medium,
                  }}
                >
                  {value}%
                </Text>
              </Pressable>
            );
          })}
        </View>
      </FormField>

      <FormField
        label="Limit Threshold"
        hint={
          budgetAmount > 0
            ? `Stop me at ${formatCurrency(Math.round((budgetAmount * draft.limitThreshold) / 100))}.`
            : 'Choose when the budget should be considered over limit.'
        }
      >
        <View className="flex-row flex-wrap gap-2">
          {[80, 90, 100, 110, 120].map((value) => {
            const active = draft.limitThreshold === value;
            return (
              <Pressable
                key={value}
                className="rounded-full px-3 py-2"
                style={{ backgroundColor: active ? colors.primary : colors.secondary }}
                onPress={() => setDraft((current) => ({ ...current, limitThreshold: value }))}
              >
                <Text
                  className="text-xs"
                  style={{
                    color: active ? colors.primaryForeground : colors.secondaryForeground,
                    fontFamily: fontFamilies.sans.medium,
                  }}
                >
                  {value}%
                </Text>
              </Pressable>
            );
          })}
        </View>
      </FormField>
    </>
  );
}
