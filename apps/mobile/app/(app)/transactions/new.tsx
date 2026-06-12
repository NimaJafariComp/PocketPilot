import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useData } from '@pocketpilot/services/src/react';
import { FormScreen } from '@/components/forms/form-screen';
import {
  type TransactionDraft,
  TransactionEditorFields,
} from '@/components/transactions/transaction-editor-fields';
import { useAppTheme } from '@/providers/theme-provider';
import { fontFamilies } from '@/theme/tokens';
import { mobileServices } from '@/config/services';

function buildInitialDraft(): TransactionDraft {
  return {
    date: new Date().toISOString().split('T')[0] || '',
    merchant: '',
    amount: '',
    type: 'expense',
    category: 'Uncategorized',
    notes: '',
  };
}

export default function NewTransactionScreen() {
  const router = useRouter();
  const { addTransaction, categories } = useData();
  const { colors } = useAppTheme();
  const [draft, setDraftState] = useState<TransactionDraft>(buildInitialDraft);
  const [isSaving, setIsSaving] = useState(false);

  const availableCategories = useMemo(
    () => (categories.length > 0 ? categories : [{ id: 'uncategorized', name: 'Uncategorized', color: '#94A3B8' }]),
    [categories],
  );

  const setDraft = (updater: (current: TransactionDraft) => TransactionDraft) => {
    setDraftState((current) => updater(current));
  };

  async function handleSave() {
    if (isSaving) {
      return;
    }

    const merchant = draft.merchant.trim();
    const parsedAmount = Number.parseFloat(draft.amount);

    if (!merchant) {
      await mobileServices.dialog.alert('Merchant is required.', 'Missing merchant');
      return;
    }

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      await mobileServices.dialog.alert('Enter a valid amount greater than 0.', 'Invalid amount');
      return;
    }

    try {
      setIsSaving(true);
      await addTransaction({
        date: new Date(draft.date).toISOString(),
        merchant,
        amount: draft.type === 'expense' ? -parsedAmount : parsedAmount,
        category: draft.category,
        notes: draft.notes.trim(),
      });
      router.replace('/transactions');
    } catch (error) {
      await mobileServices.dialog.alert(
        error instanceof Error ? error.message : 'Failed to save the transaction.',
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
            disabled={isSaving}
            onPress={handleSave}
          >
            <Text
              className="text-center text-sm"
              style={{ color: colors.primaryForeground, fontFamily: fontFamilies.sans.semibold }}
            >
              {isSaving ? 'Saving...' : 'Save Transaction'}
            </Text>
          </Pressable>
        </View>
      }
    >
      <TransactionEditorFields categories={availableCategories} draft={draft} setDraft={setDraft} />
    </FormScreen>
  );
}
