import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useData } from '@pocketpilot/services/src/react';
import { DEFAULT_TRANSACTION_FILTERS, type TransactionDateFilterType } from '@pocketpilot/core';
import { FormField } from '@/components/forms/form-field';
import { FormScreen } from '@/components/forms/form-screen';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { useAppTheme } from '@/providers/theme-provider';
import { fontFamilies } from '@/theme/tokens';

function getStringParam(value: string | string[] | undefined, fallback = '') {
  return Array.isArray(value) ? value[0] || fallback : value || fallback;
}

export default function TransactionFiltersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { categories } = useData();
  const { colors } = useAppTheme();
  const [merchantFilter, setMerchantFilter] = useState(
    getStringParam(params.merchantFilter as string | string[] | undefined, DEFAULT_TRANSACTION_FILTERS.merchantFilter),
  );
  const [categoryFilter, setCategoryFilter] = useState(
    getStringParam(params.categoryFilter as string | string[] | undefined, DEFAULT_TRANSACTION_FILTERS.categoryFilter),
  );
  const [amountFilter, setAmountFilter] = useState(
    getStringParam(params.amountFilter as string | string[] | undefined, DEFAULT_TRANSACTION_FILTERS.amountFilter),
  );
  const [dateFilterType, setDateFilterType] = useState<TransactionDateFilterType>(
    (getStringParam(
      params.dateFilterType as string | string[] | undefined,
      DEFAULT_TRANSACTION_FILTERS.dateFilterType,
    ) as TransactionDateFilterType) || 'all',
  );
  const [specificDate, setSpecificDate] = useState(
    getStringParam(params.specificDate as string | string[] | undefined, DEFAULT_TRANSACTION_FILTERS.specificDate),
  );
  const [fromDate, setFromDate] = useState(
    getStringParam(params.fromDate as string | string[] | undefined, DEFAULT_TRANSACTION_FILTERS.fromDate),
  );
  const [toDate, setToDate] = useState(
    getStringParam(params.toDate as string | string[] | undefined, DEFAULT_TRANSACTION_FILTERS.toDate),
  );

  const availableCategories = useMemo(
    () => ['all', ...categories.map((category) => category.name)],
    [categories],
  );

  const inputStyle = {
    borderColor: colors.border,
    backgroundColor: colors.card,
    color: colors.foreground,
    fontFamily: fontFamilies.sans.regular,
  } as const;

  function handleReset() {
    setMerchantFilter(DEFAULT_TRANSACTION_FILTERS.merchantFilter);
    setCategoryFilter(DEFAULT_TRANSACTION_FILTERS.categoryFilter);
    setAmountFilter(DEFAULT_TRANSACTION_FILTERS.amountFilter);
    setDateFilterType(DEFAULT_TRANSACTION_FILTERS.dateFilterType);
    setSpecificDate(DEFAULT_TRANSACTION_FILTERS.specificDate);
    setFromDate(DEFAULT_TRANSACTION_FILTERS.fromDate);
    setToDate(DEFAULT_TRANSACTION_FILTERS.toDate);
  }

  function handleApply() {
    router.replace({
      pathname: '/transactions',
      params: {
        merchantFilter: merchantFilter || undefined,
        categoryFilter: categoryFilter === 'all' ? undefined : categoryFilter,
        amountFilter: amountFilter || undefined,
        dateFilterType: dateFilterType === 'all' ? undefined : dateFilterType,
        specificDate: specificDate || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      },
    });
  }

  return (
    <FormScreen
      header={
        <ScreenHeader
          eyebrow="Transactions"
          title="Filters"
          subtitle="Match the web transaction filters with a native mobile form."
          backLabel="Back"
        />
      }
      footer={
        <View className="flex-row gap-3">
          <Pressable
            className="rounded-[20px] px-4 py-4"
            style={{ backgroundColor: colors.secondary }}
            onPress={handleReset}
          >
            <Text
              className="text-sm"
              style={{ color: colors.secondaryForeground, fontFamily: fontFamilies.sans.semibold }}
            >
              Reset
            </Text>
          </Pressable>
          <Pressable
            className="flex-1 rounded-[20px] px-4 py-4"
            style={{ backgroundColor: colors.primary }}
            onPress={handleApply}
          >
            <Text
              className="text-center text-sm"
              style={{ color: colors.primaryForeground, fontFamily: fontFamilies.sans.semibold }}
            >
              Apply Filters
            </Text>
          </Pressable>
        </View>
      }
    >
      <FormField label="Merchant">
        <TextInput
          value={merchantFilter}
          onChangeText={setMerchantFilter}
          placeholder="Search merchant"
          placeholderTextColor={colors.mutedForeground}
          className="rounded-[20px] border px-4 py-4 text-base"
          style={inputStyle}
        />
      </FormField>

      <FormField label="Category">
        <View className="flex-row flex-wrap gap-2">
          {availableCategories.map((category) => {
            const active = categoryFilter === category;
            return (
              <Pressable
                key={category}
                className="rounded-full px-3 py-2"
                style={{ backgroundColor: active ? colors.primary : colors.secondary }}
                onPress={() => setCategoryFilter(category)}
              >
                <Text
                  className="text-xs"
                  style={{
                    color: active ? colors.primaryForeground : colors.secondaryForeground,
                    fontFamily: fontFamilies.sans.medium,
                  }}
                >
                  {category === 'all' ? 'All Categories' : category}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </FormField>

      <FormField label="Amount">
        <TextInput
          value={amountFilter}
          onChangeText={setAmountFilter}
          placeholder="25.50"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="decimal-pad"
          className="rounded-[20px] border px-4 py-4 text-base"
          style={inputStyle}
        />
      </FormField>

      <FormField label="Date">
        <View className="flex-row gap-2">
          {([
            ['all', 'All'],
            ['specific', 'Specific'],
            ['range', 'Range'],
          ] as const).map(([value, label]) => {
            const active = dateFilterType === value;
            return (
              <Pressable
                key={value}
                className="flex-1 rounded-full px-4 py-3"
                style={{ backgroundColor: active ? colors.primary : colors.secondary }}
                onPress={() => setDateFilterType(value)}
              >
                <Text
                  className="text-center text-sm"
                  style={{
                    color: active ? colors.primaryForeground : colors.secondaryForeground,
                    fontFamily: fontFamilies.sans.semibold,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </FormField>

      {dateFilterType === 'specific' ? (
        <FormField label="Specific Date">
          <TextInput
            value={specificDate}
            onChangeText={setSpecificDate}
            placeholder="2026-04-07"
            placeholderTextColor={colors.mutedForeground}
            className="rounded-[20px] border px-4 py-4 text-base"
            style={inputStyle}
          />
        </FormField>
      ) : null}

      {dateFilterType === 'range' ? (
        <View className="flex-row gap-3">
          <View className="flex-1">
            <FormField label="From">
              <TextInput
                value={fromDate}
                onChangeText={setFromDate}
                placeholder="2026-04-01"
                placeholderTextColor={colors.mutedForeground}
                className="rounded-[20px] border px-4 py-4 text-base"
                style={inputStyle}
              />
            </FormField>
          </View>
          <View className="flex-1">
            <FormField label="To">
              <TextInput
                value={toDate}
                onChangeText={setToDate}
                placeholder="2026-04-30"
                placeholderTextColor={colors.mutedForeground}
                className="rounded-[20px] border px-4 py-4 text-base"
                style={inputStyle}
              />
            </FormField>
          </View>
        </View>
      ) : null}
    </FormScreen>
  );
}
