import { Text, View } from 'react-native';
import { useAppTheme } from '@/providers/theme-provider';
import type { PropsWithChildren } from 'react';
import { fontFamilies } from '@/theme/tokens';

interface ShellCardProps extends PropsWithChildren {
  eyebrow?: string;
  title: string;
  description: string;
}

export function ShellCard({ eyebrow, title, description, children }: ShellCardProps) {
  const { colors, resolvedTheme } = useAppTheme();

  return (
    <View
      className="rounded-[30px] border px-5 py-5"
      style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
      }}
    >
      {eyebrow ? (
        <Text
          className="text-[11px] uppercase tracking-[2px]"
          style={{ color: colors.primary, fontFamily: fontFamilies.sans.semibold }}
        >
          {eyebrow}
        </Text>
      ) : null}
      <Text
        className="mt-3 text-2xl tracking-tight"
        style={{ color: colors.foreground, fontFamily: fontFamilies.serif.semibold }}
      >
        {title}
      </Text>
      <Text
        className="mt-2 text-sm leading-6"
        style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
      >
        {description}
      </Text>

      <View
        className="mt-5 rounded-[24px] px-4 py-4"
        style={{
          backgroundColor: resolvedTheme === 'dark' ? '#102035' : '#EDF2FB',
        }}
      >
        {children}
      </View>
    </View>
  );
}
