import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useData } from '@pocketpilot/services/src/react';
import { BudgetEditorFields, type BudgetDraft } from '@/components/budgets/budget-editor-fields';
import { FormScreen } from '@/components/forms/form-screen';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { useAppTheme } from '@/providers/theme-provider';
import { fontFamilies } from '@/theme/tokens';
import { mobileServices } from '@/config/services';

function buildDraft(budget: {
  category: string;
  amount: number;
  month: string;
  warningThreshold: number;
  limitThreshold: number;
}): BudgetDraft {
  return {
    category: budget.category,
    amount: String(budget.amount),
    month: budget.month,
    warningThreshold: budget.warningThreshold,
    limitThreshold: budget.limitThreshold,
  };
}

export default function BudgetDetailScreen() {
  const router = useRouter();
  const { budgetId } = useLocalSearchParams<{ budgetId: string }>();
  const { budgets, categories, updateBudget, deleteBudget } = useData();
  const { colors } = useAppTheme();
  const [draft, setDraftState] = useState<BudgetDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const budget = budgets.find((item) => item.id === budgetId);

  useEffect(() => {
    if (budget) {
      setDraftState(buildDraft(budget));
    }
  }, [budget]);

  const setDraft = (updater: (current: BudgetDraft) => BudgetDraft) => {
    setDraftState((current) => (current ? updater(current) : current));
  };

  const availableCategories = useMemo(() => categories, [categories]);

  async function handleSave() {
    if (!budget || !draft || isSaving) {
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
      await updateBudget(budget.id, {
        category: draft.category,
        amount,
        month: draft.month,
        warningThreshold: draft.warningThreshold,
        limitThreshold: draft.limitThreshold,
      });
      router.replace('/budgets');
    } catch (error) {
      await mobileServices.dialog.alert(
        error instanceof Error ? error.message : 'Failed to update the budget.',
        'Save failed',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!budget) {
      return;
    }

    const confirmed = await mobileServices.dialog.confirm(
      `Delete the ${budget.category} budget for ${budget.month}?`,
      'Delete budget',
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteBudget(budget.id);
      router.replace('/budgets');
    } catch (error) {
      await mobileServices.dialog.alert(
        error instanceof Error ? error.message : 'Failed to delete the budget.',
        'Delete failed',
      );
    }
  }

  return (
    <FormScreen
      header={
        <ScreenHeader
          eyebrow="Budgets"
          title={budget ? 'Edit Budget' : 'Budget'}
          subtitle={budget ? `${budget.category} · ${budget.month}` : 'This budget is no longer available.'}
          backLabel="Back"
        />
      }
      footer={
        draft && budget ? (
          <View className="flex-row gap-3">
            <Pressable
              className="rounded-[20px] px-4 py-4"
              style={{ backgroundColor: colors.secondary }}
              onPress={handleDelete}
            >
              <Text
                className="text-sm"
                style={{ color: colors.danger, fontFamily: fontFamilies.sans.semibold }}
              >
                Delete
              </Text>
            </Pressable>
            <Pressable
              className="flex-1 rounded-[20px] px-4 py-4"
              style={{ backgroundColor: colors.primary, opacity: isSaving ? 0.65 : 1 }}
              onPress={handleSave}
              disabled={isSaving}
            >
              <Text
                className="text-center text-sm"
                style={{ color: colors.primaryForeground, fontFamily: fontFamilies.sans.semibold }}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Text>
            </Pressable>
          </View>
        ) : null
      }
    >
      {draft ? (
        <BudgetEditorFields categories={availableCategories} draft={draft} setDraft={setDraft} />
      ) : (
        <Text style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}>
          Return to budgets and choose another item.
        </Text>
      )}
    </FormScreen>
  );
}
