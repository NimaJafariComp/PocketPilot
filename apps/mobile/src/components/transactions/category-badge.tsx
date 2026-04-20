import { Text, View } from 'react-native';
import { useAppTheme } from '@/providers/theme-provider';
import { fontFamilies } from '@/theme/tokens';

interface CategoryBadgeProps {
  category: string;
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  const { colors, resolvedTheme } = useAppTheme();
  const palette = colors.categoryBadgePalette[category] || {
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
