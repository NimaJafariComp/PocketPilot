import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  buildTransactionsViewModel,
  DEFAULT_TRANSACTION_FILTERS,
  type TransactionDateFilterType,
  type TransactionListFilter,
  type TransactionsFilterState,
} from '@pocketpilot/core';
import { CirclePlus, Filter, Search, Upload } from 'lucide-react-native';
import { useData } from '@pocketpilot/services/src/react';
import { Screen } from '@/components/screen';
import { HeaderActions } from '@/components/navigation/header-actions';
import { AlertBanner } from '@/components/data/alert-banner';
import { EmptyStateCard } from '@/components/data/empty-state-card';
import { FilterChip } from '@/components/data/filter-chip';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { SectionCard } from '@/components/data/section-card';
import { SummaryStrip } from '@/components/data/summary-strip';
import { TransactionRow } from '@/components/transactions/transaction-row';
import { useAppTheme } from '@/providers/theme-provider';
import { formatCurrencyPrecise } from '@/lib/format';
import { fontFamilies } from '@/theme/tokens';

const INITIAL_VISIBLE = 2;
const LOAD_MORE_STEP = 20;

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

export default function TransactionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { transactions, loading } = useData();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [filters, setFilters] = useState<TransactionsFilterState>(DEFAULT_TRANSACTION_FILTERS);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

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
    setVisibleCount(INITIAL_VISIBLE);
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

  const viewModel = useMemo(() => buildTransactionsViewModel(transactions, filters, LOAD_MORE_STEP), [
    filters,
    transactions,
  ]);

  const visibleTransactions = useMemo(
    () => viewModel.filteredTransactions.slice(0, visibleCount),
    [visibleCount, viewModel.filteredTransactions],
  );

  const hasMore = visibleCount < viewModel.filteredTransactions.length;

  function updateFilters(next: Partial<TransactionsFilterState>) {
    setFilters((current) => ({ ...current, ...next }));
  }

  function clearAllFilters() {
    setFilters(DEFAULT_TRANSACTION_FILTERS);
    router.replace('/transactions');
  }

  return (
    <Screen atmospheric atmosphericIntensity="medium">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 16, paddingTop: 8, paddingBottom: Math.max(160, insets.bottom + 32) }}
      >
        <ScreenHeader
          eyebrow="Transactions"
          title="Transactions"
          subtitle={`${viewModel.filteredTransactions.length} of ${transactions.length} transactions${viewModel.hasActiveFilters ? ' filtered' : ''}`}
          rightSlot={<HeaderActions />}
        />
        <View className="flex-row gap-3">
          <Pressable
            className="flex-1 flex-row items-center justify-center gap-2 rounded-[22px] px-4 py-4"
            style={{ backgroundColor: colors.primary }}
            onPress={() => router.push('/transactions/new' as never)}
          >
            <CirclePlus size={18} color={colors.primaryForeground} strokeWidth={2.2} />
            <Text
              className="text-sm"
              style={{ color: colors.primaryForeground, fontFamily: fontFamilies.sans.semibold }}
            >
              Add Transaction
            </Text>
          </Pressable>
          <Pressable
            className="rounded-[22px] px-4 py-4"
            style={{ backgroundColor: colors.secondary }}
            onPress={() =>
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
              })
            }
          >
            <Filter size={18} color={colors.secondaryForeground} strokeWidth={2.2} />
          </Pressable>
          <Pressable
            className="rounded-[22px] px-4 py-4"
            style={{ backgroundColor: colors.secondary }}
            onPress={() => router.push('/(app)/import')}
          >
            <Upload size={18} color={colors.secondaryForeground} strokeWidth={2.2} />
          </Pressable>
        </View>

        {viewModel.needsReviewCount > 0 ? (
          <AlertBanner
            tone="warning"
            message={`${viewModel.needsReviewCount} transaction${viewModel.needsReviewCount === 1 ? '' : 's'} need categorization or review.`}
            actionLabel="Review"
            onActionPress={() => updateFilters({ listFilter: 'review' })}
          />
        ) : null}

        <SummaryStrip
          eyebrow="Transactions"
          tone="transactions"
          items={[
            {
              label: 'Total Spent',
              value: formatCurrencyPrecise(viewModel.spent),
              detail: 'Across the visible result set',
              valueColor: colors.danger,
            },
            {
              label: 'Total Income',
              value: formatCurrencyPrecise(viewModel.income),
              detail: `${viewModel.uncategorizedCount} uncategorized overall`,
              valueColor: colors.success,
            },
          ]}
        />

        <SectionCard
          title="Search and review"
          subtitle="Use quick filters here and open the native filter sheet for category, amount, and date controls."
          eyebrow="Workbench"
          tone="transactions"
          badge="Filters"
        >
          <View className="gap-4">
            <View
              className="flex-row items-center gap-3 rounded-[22px] border px-4 py-1"
              style={{ backgroundColor: colors.muted, borderColor: colors.border }}
            >
              <Search size={18} color={colors.mutedForeground} strokeWidth={2.2} />
              <TextInput
                value={filters.merchantFilter}
                onChangeText={(value) => updateFilters({ merchantFilter: value })}
                placeholder="Search merchant"
                placeholderTextColor={colors.mutedForeground}
                className="flex-1 py-4 text-base"
                style={{
                  color: colors.foreground,
                  fontFamily: fontFamilies.sans.regular,
                }}
              />
            </View>
            <View className="flex-row flex-wrap gap-2">
              {([
                ['all', 'All'],
                ['review', 'Needs Review'],
                ['expense', 'Expenses'],
                ['income', 'Income'],
              ] as const).map(([value, label]) => {
                return (
                  <FilterChip
                    key={value}
                    label={label}
                    active={filters.listFilter === value}
                    onPress={() => updateFilters({ listFilter: value })}
                  />
                );
              })}
            </View>
            {viewModel.hasActiveFilters ? (
              <View className="flex-row items-center justify-between gap-3">
                <Text
                  className="flex-1 text-xs leading-5"
                  style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
                >
                  Category: {filters.categoryFilter === 'all' ? 'All' : filters.categoryFilter}
                  {'  '}•{'  '}
                  Date: {filters.dateFilterType === 'all' ? 'All dates' : filters.dateFilterType}
                </Text>
                <Pressable onPress={clearAllFilters}>
                  <Text
                    className="text-xs"
                    style={{ color: colors.foreground, fontFamily: fontFamilies.sans.semibold }}
                  >
                    Clear all
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </SectionCard>

        <SectionCard
          title="All transactions"
          subtitle="Each row preserves the same merchant, category, status, and amount cues from the web experience."
        >
          <View className="gap-3">
            {loading ? (
              <EmptyStateCard
                title="Loading transactions"
                description="Pulling your latest activity from the shared data layer."
              />
            ) : visibleTransactions.length > 0 ? (
              <>
                {visibleTransactions.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    onPress={() => router.push(`/transactions/${transaction.id}` as never)}
                  />
                ))}
                {hasMore ? (
                  <Pressable
                    className="rounded-[20px] px-4 py-4"
                    style={{ backgroundColor: colors.secondary }}
                    onPress={() => setVisibleCount((c) => Math.min(viewModel.filteredTransactions.length, c + LOAD_MORE_STEP))}
                  >
                    <Text
                      className="text-center text-sm"
                      style={{ color: colors.secondaryForeground, fontFamily: fontFamilies.sans.semibold }}
                    >
                      Load more
                    </Text>
                  </Pressable>
                ) : null}
              </>
            ) : (
              <EmptyStateCard
                title="No matching transactions"
                description="Try a different merchant search or clear the active filters."
              >
                {viewModel.hasActiveFilters ? (
                  <Pressable
                    className="self-start rounded-full px-4 py-2"
                    style={{ backgroundColor: colors.secondary }}
                    onPress={clearAllFilters}
                  >
                    <Text
                      className="text-sm"
                      style={{ color: colors.secondaryForeground, fontFamily: fontFamilies.sans.semibold }}
                    >
                      Clear filters
                    </Text>
                  </Pressable>
                ) : null}
              </EmptyStateCard>
            )}
          </View>
        </SectionCard>
      </ScrollView>
    </Screen>
  );
}
