import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useData } from '@pocketpilot/services/src/react';
import { FormScreen } from '@/components/forms/form-screen';
import { BudgetEditorFields, type BudgetDraft } from '@/components/budgets/budget-editor-fields';
import { useAppTheme } from '@/providers/theme-provider';
import { fontFamilies } from '@/theme/tokens';
import { mobileServices } from '@/config/services';
import { getMonthKey } from '@/lib/format';

function buildInitialDraft(): BudgetDraft {
  return {
    category: '',
    amount: '',
    month: getMonthKey(),
    warningThreshold: 80,
    limitThreshold: 100,
  };
}

export default function NewBudgetScreen() {
  const router = useRouter();
  const { addBudget, categories } = useData();
  const { colors } = useAppTheme();
  const [draft, setDraftState] = useState<BudgetDraft>(buildInitialDraft);
  const [isSaving, setIsSaving] = useState(false);

  const setDraft = (updater: (current: BudgetDraft) => BudgetDraft) => {
    setDraftState((current) => updater(current));
  };

  const availableCategories = useMemo(() => categories, [categories]);

  async function handleSave() {
    if (isSaving) {
      return;
    }

    const amount = Number.parseFloat(draft.amount);
    if (!draft.category) {
      await mobileServices.dialog.alert('Choose a budget category.', 'Missing category');
      return;
    }
    if (Number.isNaN(amount) || amount <= 0) {
      await mobileServices.dialog.alert('Enter a valid budget amount greater than 0.', 'Invalid amount');
      return;
    }

    try {
      setIsSaving(true);
      await addBudget({
        category: draft.category,
        amount,
        month: draft.month,
        warningThreshold: draft.warningThreshold,
        limitThreshold: draft.limitThreshold,
      });
      router.replace('/budgets');
    } catch (error) {
      await mobileServices.dialog.alert(
        error instanceof Error ? error.message : 'Failed to create the budget.',
        'Save failed',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <FormScreen
      footer={
        <View className="flex-row gap-3">
          <Pressable
            className="flex-1 rounded-xl px-4 py-4"
            style={{ backgroundColor: colors.secondary }}
            onPress={() => router.back()}
          >
            <Text
              className="text-center text-sm"
              style={{ color: colors.secondaryForeground, fontFamily: fontFamilies.sans.semibold }}
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
              className="text-center text-sm"
              style={{ color: colors.primaryForeground, fontFamily: fontFamilies.sans.semibold }}
            >
              {isSaving ? 'Saving...' : 'Create Budget'}
            </Text>
          </Pressable>
        </View>
      }
    >
      <BudgetEditorFields categories={availableCategories} draft={draft} setDraft={setDraft} />
    </FormScreen>
  );
}
