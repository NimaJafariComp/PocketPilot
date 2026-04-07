import { Text, View } from 'react-native';
import { useAppTheme } from '@/providers/theme-provider';
import { fontFamilies } from '@/theme/tokens';
import type { Transaction } from '@pocketpilot/core';

interface CategorizationStatusBadgeProps {
  transaction: Transaction;
}

export function CategorizationStatusBadge({ transaction }: CategorizationStatusBadgeProps) {
  const { colors } = useAppTheme();

  if (transaction.categoryNeedsReview) {
    return (
      <View className="self-start rounded-full px-2.5 py-1" style={{ backgroundColor: 'rgba(213, 155, 47, 0.14)' }}>
        <Text className="text-[11px]" style={{ color: colors.warning, fontFamily: fontFamilies.sans.medium }}>
          Needs Review
        </Text>
      </View>
    );
  }

  if (transaction.categorySource?.startsWith('auto-')) {
    return (
      <View className="self-start rounded-full px-2.5 py-1" style={{ backgroundColor: colors.secondary }}>
        <Text className="text-[11px]" style={{ color: colors.secondaryForeground, fontFamily: fontFamilies.sans.medium }}>
          Auto-Categorized
        </Text>
      </View>
    );
  }

  return null;
}
