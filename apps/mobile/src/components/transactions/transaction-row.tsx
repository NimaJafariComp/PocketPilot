import { Pressable, Text, View } from 'react-native';
import { PenSquare } from 'lucide-react-native';
import { useAppTheme } from '@/providers/theme-provider';
import { fontFamilies } from '@/theme/tokens';
import { formatShortDate, formatCurrencyPrecise } from '@/lib/format';
import { CategoryBadge } from '@/components/transactions/category-badge';
import { CategorizationStatusBadge } from '@/components/transactions/categorization-status-badge';
import type { Transaction } from '@pocketpilot/core';

interface TransactionRowProps {
  transaction: Transaction;
  onPress?: () => void;
}

export function TransactionRow({ transaction, onPress }: TransactionRowProps) {
  const { colors } = useAppTheme();
  const isIncome = transaction.amount > 0;

  return (
    <Pressable
      className="rounded-[24px] border px-4 py-4"
      style={{ backgroundColor: colors.card, borderColor: colors.border }}
      onPress={onPress}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-2">
          <View className="flex-row items-center justify-between gap-3">
            <Text
              className="flex-1 text-sm"
              style={{ color: colors.foreground, fontFamily: fontFamilies.sans.semibold }}
            >
              {transaction.merchant}
            </Text>
            <View className="flex-row items-center gap-2">
              <Text
                className="text-sm"
                style={{
                  color: isIncome ? colors.success : colors.foreground,
                  fontFamily: fontFamilies.sans.semibold,
                }}
              >
                {isIncome ? '+' : '-'}
                {formatCurrencyPrecise(Math.abs(transaction.amount))}
              </Text>
              {onPress ? <PenSquare size={15} color={colors.mutedForeground} strokeWidth={2.2} /> : null}
            </View>
          </View>

          <Text
            className="text-xs"
            style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
          >
            {formatShortDate(transaction.date)}
          </Text>

          <View className="flex-row flex-wrap items-center gap-2">
            <CategoryBadge category={transaction.category} />
            <CategorizationStatusBadge transaction={transaction} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}
