import type { Transaction } from "@pocketpilot/core";
import { ChevronRight } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { CategorizationStatusBadge } from "@/components/transactions/categorization-status-badge";
import { CategoryBadge } from "@/components/transactions/category-badge";
import { formatCurrencyPrecise, formatShortDate } from "@/lib/format";
import { hapticSelect } from "@/lib/haptics";
import { useAppTheme } from "@/providers/theme-provider";
import { fontFamilies } from "@/theme/tokens";

interface TransactionRowProps {
  transaction: Transaction;
  onPress?: () => void;
  /** Hairline separator below the row; omit on the last row of a group. */
  separator?: boolean;
}

// Table-view row: merchant + meta on the left, amount + disclosure chevron on
// the right, hairline separator inset to the text edge.
export function TransactionRow({ transaction, onPress, separator = false }: TransactionRowProps) {
  const { colors } = useAppTheme();
  const isIncome = transaction.amount > 0;

  return (
    <Pressable
      onPress={() => {
        if (onPress) {
          hapticSelect();
          onPress();
        }
      }}
      style={({ pressed }) => ({ opacity: pressed && onPress ? 0.6 : 1 })}
    >
      <View className="flex-row items-center gap-3 py-3">
        <View className="flex-1 gap-1">
          <Text
            className="text-[16px]"
            numberOfLines={1}
            style={{ color: colors.foreground, fontFamily: fontFamilies.sans.medium }}
          >
            {transaction.merchant}
          </Text>
          <View className="flex-row flex-wrap items-center gap-1.5">
            <Text
              className="text-[13px]"
              style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
            >
              {formatShortDate(transaction.date)}
            </Text>
            <CategoryBadge category={transaction.category} />
            <CategorizationStatusBadge transaction={transaction} />
          </View>
        </View>
        <Text
          className="text-[16px]"
          style={{
            color: isIncome ? colors.success : colors.foreground,
            fontFamily: fontFamilies.sans.semibold,
          }}
        >
          {isIncome ? "+" : "-"}
          {formatCurrencyPrecise(Math.abs(transaction.amount))}
        </Text>
        {onPress ? <ChevronRight size={17} color={colors.mutedForeground} strokeWidth={2} /> : null}
      </View>
      {separator ? <View className="h-px" style={{ backgroundColor: colors.border }} /> : null}
    </Pressable>
  );
}
