import { Text, View } from 'react-native';
import { useAppTheme } from '@/providers/theme-provider';
import type { PropsWithChildren } from 'react';
import { fontFamilies } from '@/theme/tokens';

interface ShellCardProps extends PropsWithChildren {
  /** @deprecated unused in the native redesign */
  eyebrow?: string;
  title: string;
  description: string;
}

export function ShellCard({ title, description, children }: ShellCardProps) {
  const { colors } = useAppTheme();

  return (
    <View className="rounded-xl px-4 py-4" style={{ backgroundColor: colors.card }}>
      <Text
        className="text-[17px] tracking-tight"
        style={{ color: colors.foreground, fontFamily: fontFamilies.sans.semibold }}
      >
        {title}
      </Text>
      <Text
        className="mt-1 text-[14px] leading-5"
        style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
      >
        {description}
      </Text>

      <View className="mt-4 rounded-lg px-3 py-3" style={{ backgroundColor: colors.panelMuted }}>
        {children}
      </View>
    </View>
  );
}
