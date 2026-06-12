import { FlatList, Pressable, Text, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  buildTransactionsViewModel,
  DEFAULT_TRANSACTION_FILTERS,
  type Transaction,
  type TransactionDateFilterType,
  type TransactionListFilter,
  type TransactionsFilterState,
} from '@pocketpilot/core';
import { Plus, SlidersHorizontal } from 'lucide-react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useData } from '@pocketpilot/services/src/react';
import { Screen } from '@/components/screen';
import { HeaderIconButton } from '@/components/navigation/header-icon-button';
import { useTabScrollPadding } from '@/lib/tab-scroll';
import { AlertBanner } from '@/components/data/alert-banner';
import { EmptyStateCard } from '@/components/data/empty-state-card';
import { FilterChip } from '@/components/data/filter-chip';
import { SummaryStrip } from '@/components/data/summary-strip';
import { TransactionRow } from '@/components/transactions/transaction-row';
import { useAppTheme } from '@/providers/theme-provider';
import { formatCurrencyPrecise } from '@/lib/format';
import { fontFamilies } from '@/theme/tokens';
import { mobileServices } from '@/config/services';
import { hapticSelect, hapticWarning } from '@/lib/haptics';

const PAGE_SIZE = 30;

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

export default function TransactionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { transactions, loading, deleteTransaction } = useData();
  const { colors } = useAppTheme();
  const tabScrollPadding = useTabScrollPadding();
  const [filters, setFilters] = useState<TransactionsFilterState>(DEFAULT_TRANSACTION_FILTERS);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setFilters({
      merchantFilter: getStringParam(params.merchantFilter as string | string[] | undefined),
      categoryFilter: getStringParam(params.categoryFilter as string | string[] | undefined) || 'all',
      amountFilter: getStringParam(params.amountFilter as string | string[] | undefined),
      dateFilterType:
        (getStringParam(params.dateFilterType as string | string[] | undefined) as TransactionDateFilterType) ||
        'all',
      specificDate: getStringParam(params.specificDate as string | string[] | undefined),
      fromDate: getStringParam(params.fromDate as string | string[] | undefined),
      toDate: getStringParam(params.toDate as string | string[] | undefined),
      listFilter:
        (getStringParam(params.listFilter as string | string[] | undefined) as TransactionListFilter) || 'all',
    });
  }, [
    params.amountFilter,
    params.categoryFilter,
    params.dateFilterType,
    params.fromDate,
    params.listFilter,
    params.merchantFilter,
    params.specificDate,
    params.toDate,
  ]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [
    filters.amountFilter,
    filters.categoryFilter,
    filters.dateFilterType,
    filters.fromDate,
    filters.listFilter,
    filters.merchantFilter,
    filters.specificDate,
    filters.toDate,
  ]);

  const viewModel = useMemo(() => buildTransactionsViewModel(transactions, filters, PAGE_SIZE), [
    filters,
    transactions,
  ]);

  const visibleTransactions = useMemo(
    () => viewModel.filteredTransactions.slice(0, visibleCount),
    [visibleCount, viewModel.filteredTransactions],
  );

  function updateFilters(next: Partial<TransactionsFilterState>) {
    setFilters((current) => ({ ...current, ...next }));
  }

  function clearAllFilters() {
    setFilters(DEFAULT_TRANSACTION_FILTERS);
    router.replace('/transactions');
  }

  async function handleDelete(transaction: Transaction) {
    hapticWarning();
    const confirmed = await mobileServices.dialog.confirm(
      `Delete the ${transaction.merchant} transaction?`,
      'Delete transaction',
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteTransaction(transaction.id);
    } catch (error) {
      await mobileServices.dialog.alert(
        error instanceof Error ? error.message : 'Failed to delete the transaction.',
        'Delete failed',
      );
    }
  }

  function openFilters() {
    router.push({
      pathname: '/transactions/filters' as never,
      params: {
        merchantFilter: filters.merchantFilter || undefined,
        categoryFilter: filters.categoryFilter,
        amountFilter: filters.amountFilter || undefined,
        dateFilterType: filters.dateFilterType,
        specificDate: filters.specificDate || undefined,
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
      },
    });
  }

  const listHeader = (
    <View className="gap-4 pb-4 pt-4">
      {viewModel.needsReviewCount > 0 ? (
        <AlertBanner
          tone="warning"
          message={`${viewModel.needsReviewCount} transaction${viewModel.needsReviewCount === 1 ? '' : 's'} need review.`}
          actionLabel="Review"
          onActionPress={() => updateFilters({ listFilter: 'review' })}
        />
      ) : null}

      <SummaryStrip
        items={[
          {
            label: 'Spent',
            value: formatCurrencyPrecise(viewModel.spent),
            valueColor: colors.danger,
          },
          {
            label: 'Income',
            value: formatCurrencyPrecise(viewModel.income),
            valueColor: colors.success,
          },
        ]}
      />

      <View className="flex-row flex-wrap items-center gap-2">
        {([
          ['all', 'All'],
          ['review', 'Needs Review'],
          ['expense', 'Expenses'],
          ['income', 'Income'],
        ] as const).map(([value, label]) => (
          <FilterChip
            key={value}
            label={label}
            active={filters.listFilter === value}
            onPress={() => updateFilters({ listFilter: value })}
          />
        ))}
      </View>

      {viewModel.hasActiveFilters ? (
        <View className="flex-row items-center justify-between gap-3">
          <Text
            className="flex-1 text-[13px] leading-4"
            style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
          >
            {viewModel.filteredTransactions.length} of {transactions.length} shown
            {filters.categoryFilter !== 'all' ? ` • ${filters.categoryFilter}` : ''}
            {filters.dateFilterType !== 'all' ? ` • ${filters.dateFilterType}` : ''}
          </Text>
          <Pressable onPress={clearAllFilters} hitSlop={8}>
            <Text
              className="text-[14px]"
              style={{ color: colors.tint, fontFamily: fontFamilies.sans.regular }}
            >
              Clear Filters
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  function renderRow({ item, index }: { item: Transaction; index: number }) {
    const first = index === 0;
    const last = index === visibleTransactions.length - 1;

    return (
      <View
        className="overflow-hidden"
        style={{
          backgroundColor: colors.danger,
          borderTopLeftRadius: first ? 12 : 0,
          borderTopRightRadius: first ? 12 : 0,
          borderBottomLeftRadius: last ? 12 : 0,
          borderBottomRightRadius: last ? 12 : 0,
        }}
      >
        <ReanimatedSwipeable
          friction={2}
          rightThreshold={40}
          overshootRight={false}
          onSwipeableWillOpen={() => hapticSelect()}
          renderRightActions={() => (
            <Pressable
              className="w-[88px] items-center justify-center"
              style={{ backgroundColor: colors.danger }}
              onPress={() => handleDelete(item)}
            >
              <Text
                className="text-[16px]"
                style={{ color: '#FFFFFF', fontFamily: fontFamilies.sans.medium }}
              >
                Delete
              </Text>
            </Pressable>
          )}
        >
          <View className="px-4" style={{ backgroundColor: colors.card }}>
            <TransactionRow
              transaction={item}
              separator={!last}
              onPress={() => router.push(`/transactions/${item.id}` as never)}
            />
          </View>
        </ReanimatedSwipeable>
      </View>
    );
  }

  return (
    <Screen padded={false}>
      <Stack.Screen
        options={{
          headerSearchBarOptions: {
            placeholder: 'Search merchants',
            textColor: colors.foreground,
            tintColor: colors.tint,
            onChangeText: (event) => updateFilters({ merchantFilter: event.nativeEvent.text }),
          },
          headerRight: () => (
            <View className="flex-row items-center gap-4">
              <HeaderIconButton
                label="Filters"
                symbol="line.3.horizontal.decrease"
                fallback={<SlidersHorizontal size={21} color={colors.tint} strokeWidth={2} />}
                onPress={openFilters}
              />
              <HeaderIconButton
                label="Add transaction"
                symbol="plus"
                fallback={<Plus size={22} color={colors.tint} strokeWidth={2} />}
                onPress={() => router.push('/transactions/new' as never)}
              />
            </View>
          ),
        }}
      />
      <FlatList
        data={visibleTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderRow}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: tabScrollPadding }}
        ListHeaderComponent={listHeader}
        onEndReachedThreshold={0.4}
        onEndReached={() =>
          setVisibleCount((count) =>
            Math.min(viewModel.filteredTransactions.length, count + PAGE_SIZE),
          )
        }
        ListEmptyComponent={
          loading ? (
            <EmptyStateCard
              title="Loading transactions"
              description="Pulling your latest activity."
            />
          ) : (
            <EmptyStateCard
              title="No matching transactions"
              description="Try a different search or clear the active filters."
            >
              {viewModel.hasActiveFilters ? (
                <Pressable onPress={clearAllFilters} hitSlop={6}>
                  <Text
                    className="text-[16px]"
                    style={{ color: colors.tint, fontFamily: fontFamilies.sans.regular }}
                  >
                    Clear Filters
                  </Text>
                </Pressable>
              ) : null}
            </EmptyStateCard>
          )
        }
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      />
    </Screen>
  );
}
