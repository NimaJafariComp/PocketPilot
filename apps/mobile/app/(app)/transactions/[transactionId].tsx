import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useData, useServices } from '@pocketpilot/services/src/react';
import { CategoryBadge } from '@/components/transactions/category-badge';
import { CategorizationStatusBadge } from '@/components/transactions/categorization-status-badge';
import { FormScreen } from '@/components/forms/form-screen';
import { ScreenHeader } from '@/components/navigation/screen-header';
import {
  type TransactionDraft,
  TransactionEditorFields,
} from '@/components/transactions/transaction-editor-fields';
import { useAppTheme } from '@/providers/theme-provider';
import { formatCurrencyPrecise } from '@/lib/format';
import { fontFamilies } from '@/theme/tokens';
import { mobileServices } from '@/config/services';

function buildDraftFromTransaction(transaction: {
  date: string;
  merchant: string;
  amount: number;
  category: string;
  notes?: string;
}): TransactionDraft {
  return {
    date: transaction.date.includes('T') ? transaction.date.split('T')[0] || transaction.date : transaction.date,
    merchant: transaction.merchant,
    amount: String(Math.abs(transaction.amount)),
    type: transaction.amount < 0 ? 'expense' : 'income',
    category: transaction.category,
    notes: transaction.notes || '',
  };
}

export default function TransactionDetailScreen() {
  const router = useRouter();
  const { transactionId } = useLocalSearchParams<{ transactionId: string }>();
  const { transactions, categories, updateTransaction, deleteTransaction } = useData();
  const services = useServices();
  const { colors } = useAppTheme();
  const [draft, setDraftState] = useState<TransactionDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const transaction = transactions.find((item) => item.id === transactionId);

  useEffect(() => {
    if (transaction) {
      setDraftState(buildDraftFromTransaction(transaction));
    }
  }, [transaction]);

  const availableCategories = useMemo(
    () => (categories.length > 0 ? categories : [{ id: 'uncategorized', name: 'Uncategorized', color: '#94A3B8' }]),
    [categories],
  );

  const setDraft = (updater: (current: TransactionDraft) => TransactionDraft) => {
    setDraftState((current) => (current ? updater(current) : current));
  };

  async function handleSave() {
    if (!transaction || !draft || isSaving) {
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

      let transactionToSave = {
        ...transaction,
        date: new Date(draft.date).toISOString(),
        merchant,
        amount: draft.type === 'expense' ? -parsedAmount : parsedAmount,
        category: draft.category,
        notes: draft.notes.trim(),
      };

      if (transactionToSave.category === 'Uncategorized') {
        const [result] = await services.categorization.categorizeTransactions({
          transactions: [
            {
              merchant: transactionToSave.merchant,
              amount: transactionToSave.amount,
              notes: transactionToSave.notes || '',
            },
          ],
          categories: availableCategories.map((category) => category.name),
        });

        if (result) {
          transactionToSave = {
            ...transactionToSave,
            category: result.category,
            categorySource: result.categorySource,
            categoryConfidence: result.categoryConfidence,
            categoryNeedsReview: result.categoryNeedsReview,
            normalizedMerchant: result.normalizedMerchant,
          };
        }
      } else if (transactionToSave.category !== transaction.category) {
        transactionToSave = {
          ...transactionToSave,
          categorySource: 'manual',
          categoryConfidence: 1,
          categoryNeedsReview: false,
        };

        await services.categorization.learnMerchantCategory({
          merchant: transactionToSave.merchant,
          category: transactionToSave.category,
        });
      }

      await updateTransaction(transaction.id, transactionToSave);
      router.replace('/transactions');
    } catch (error) {
      await mobileServices.dialog.alert(
        error instanceof Error ? error.message : 'Failed to update the transaction.',
        'Save failed',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!transaction) {
      return;
    }

    const confirmed = await mobileServices.dialog.confirm(
      `Delete ${transaction.merchant}? This action cannot be undone.`,
      'Delete transaction',
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteTransaction(transaction.id);
      router.replace('/transactions');
    } catch (error) {
      await mobileServices.dialog.alert(
        error instanceof Error ? error.message : 'Failed to delete the transaction.',
        'Delete failed',
      );
    }
  }

  if (!transaction || !draft) {
    return (
      <FormScreen
        header={
          <ScreenHeader
            eyebrow="Transactions"
            title="Transaction"
            subtitle="This transaction is no longer available."
            backLabel="Back"
          />
        }
      >
        <Text style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}>
          Return to the transactions tab and choose another row.
        </Text>
      </FormScreen>
    );
  }

  return (
    <FormScreen
      header={
        <ScreenHeader
          eyebrow="Transactions"
          title="Edit Transaction"
          subtitle={transaction.merchant}
          backLabel="Back"
        />
      }
      footer={
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
            disabled={isSaving}
            onPress={handleSave}
          >
            <Text
              className="text-center text-sm"
              style={{ color: colors.primaryForeground, fontFamily: fontFamilies.sans.semibold }}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Text>
          </Pressable>
        </View>
      }
    >
      <View
        className="rounded-[28px] border px-5 py-5"
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      >
        <Text
          className="text-3xl tracking-tight"
          style={{
            color: transaction.amount < 0 ? colors.foreground : colors.success,
            fontFamily: fontFamilies.sans.semibold,
          }}
        >
          {transaction.amount < 0 ? '-' : '+'}
          {formatCurrencyPrecise(Math.abs(transaction.amount))}
        </Text>
        <Text
          className="mt-2 text-sm leading-6"
          style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
        >
          {draft.date}
        </Text>
        <View className="mt-4 flex-row flex-wrap items-center gap-2">
          <CategoryBadge category={transaction.category} />
          <CategorizationStatusBadge transaction={transaction} />
        </View>
      </View>

      <TransactionEditorFields categories={availableCategories} draft={draft} setDraft={setDraft} />
    </FormScreen>
  );
}
