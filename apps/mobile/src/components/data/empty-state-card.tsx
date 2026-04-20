import { Text, View } from 'react-native';
import type { PropsWithChildren } from 'react';
import { useAppTheme } from '@/providers/theme-provider';
import { fontFamilies } from '@/theme/tokens';

interface EmptyStateCardProps extends PropsWithChildren {
  title: string;
  description: string;
}

export function EmptyStateCard({ title, description, children }: EmptyStateCardProps) {
  const { colors } = useAppTheme();

  return (
    <View
      className="rounded-[24px] border px-4 py-4"
      style={{
        borderColor: colors.border,
        backgroundColor: colors.panelMuted,
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
