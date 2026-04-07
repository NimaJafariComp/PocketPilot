import { Text, View } from 'react-native';
import { useAppTheme } from '@/providers/theme-provider';
import { fontFamilies } from '@/theme/tokens';

interface CategoryBadgeProps {
  category: string;
}

const CATEGORY_COLORS: Record<string, { backgroundColor: string; color: string }> = {
  Food: { backgroundColor: 'rgba(245, 158, 11, 0.16)', color: '#B45309' },
  Groceries: { backgroundColor: 'rgba(213, 155, 47, 0.14)', color: '#A16207' },
  Dining: { backgroundColor: 'rgba(245, 158, 11, 0.16)', color: '#B45309' },
  Transport: { backgroundColor: 'rgba(43, 103, 246, 0.14)', color: '#1D4ED8' },
  Transportation: { backgroundColor: 'rgba(43, 103, 246, 0.14)', color: '#1D4ED8' },
  Entertainment: { backgroundColor: 'rgba(139, 92, 246, 0.16)', color: '#7C3AED' },
  Shopping: { backgroundColor: 'rgba(220, 73, 96, 0.14)', color: '#BE123C' },
  Health: { backgroundColor: 'rgba(31, 157, 114, 0.14)', color: '#047857' },
  Income: { backgroundColor: 'rgba(31, 157, 114, 0.14)', color: '#047857' },
  Utilities: { backgroundColor: 'rgba(20, 184, 166, 0.14)', color: '#0F766E' },
  Bills: { backgroundColor: 'rgba(220, 73, 96, 0.14)', color: '#BE123C' },
  Uncategorized: { backgroundColor: 'rgba(98, 113, 139, 0.14)', color: '#475569' },
};

export function CategoryBadge({ category }: CategoryBadgeProps) {
  const { colors, resolvedTheme } = useAppTheme();
  const palette = CATEGORY_COLORS[category] || {
    backgroundColor: colors.secondary,
    color: resolvedTheme === 'dark' ? colors.secondaryForeground : colors.foreground,
  };

  return (
    <View className="self-start rounded-full px-2.5 py-1" style={{ backgroundColor: palette.backgroundColor }}>
      <Text
        className="text-[11px]"
        style={{ color: palette.color, fontFamily: fontFamilies.sans.medium }}
      >
        {category}
      </Text>
    </View>
  );
}
