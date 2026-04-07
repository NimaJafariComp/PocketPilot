import { Text, View } from 'react-native';
import type { PropsWithChildren } from 'react';
import { useAppTheme } from '@/providers/theme-provider';
import { fontFamilies } from '@/theme/tokens';

interface EmptyStateCardProps extends PropsWithChildren {
  title: string;
  description: string;
}

export function EmptyStateCard({ title, description, children }: EmptyStateCardProps) {
  const { colors, resolvedTheme } = useAppTheme();

  return (
    <View
      className="rounded-[24px] px-4 py-4"
      style={{
        backgroundColor: resolvedTheme === 'dark' ? '#102035' : '#EDF2FB',
      }}
    >
      <Text className="text-sm" style={{ color: colors.foreground, fontFamily: fontFamilies.sans.semibold }}>
        {title}
      </Text>
      <Text
        className="mt-2 text-sm leading-6"
        style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
      >
        {description}
      </Text>
      {children ? <View className="mt-4">{children}</View> : null}
    </View>
  );
}
