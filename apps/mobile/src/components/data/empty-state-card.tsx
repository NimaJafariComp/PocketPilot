import { Text, View } from 'react-native';
import type { PropsWithChildren } from 'react';
import { useAppTheme } from '@/providers/theme-provider';
import { fontFamilies } from '@/theme/tokens';

export function EmptyStateCard({ title, description, children }: PropsWithChildren<{ title: string; description: string }>) {
  const { colors } = useAppTheme();

  return (
    <View className="items-center rounded-xl px-6 py-8" style={{ backgroundColor: colors.card }}>
      <Text
        className="text-center text-[16px]"
        style={{ color: colors.foreground, fontFamily: fontFamilies.sans.semibold }}
      >
        {title}
      </Text>
      <Text
        className="mt-1 text-center text-[14px] leading-5"
        style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
      >
        {description}
      </Text>
      {children ? <View className="mt-4 items-center">{children}</View> : null}
    </View>
  );
}
