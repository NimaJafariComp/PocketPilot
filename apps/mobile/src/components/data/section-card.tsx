import { Text, View } from 'react-native';
import type { PropsWithChildren } from 'react';
import { useAppTheme } from '@/providers/theme-provider';
import { fontFamilies } from '@/theme/tokens';

interface SectionCardProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
}

export function SectionCard({ title, subtitle, children }: SectionCardProps) {
  const { colors } = useAppTheme();

  return (
    <View
      className="rounded-[28px] border px-5 py-5"
      style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
      }}
    >
      <Text
        className="text-lg tracking-tight"
        style={{ color: colors.foreground, fontFamily: fontFamilies.serif.semibold }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          className="mt-1 text-sm leading-6"
          style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
        >
          {subtitle}
        </Text>
      ) : null}
      <View className="mt-4">{children}</View>
    </View>
  );
}
