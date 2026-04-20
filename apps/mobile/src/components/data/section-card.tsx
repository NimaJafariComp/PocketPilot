import { Text, View } from 'react-native';
import type { PropsWithChildren } from 'react';
import { useAppTheme } from '@/providers/theme-provider';
import { fontFamilies, type SectionTone } from '@/theme/tokens';

interface SectionCardProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  tone?: SectionTone;
  badge?: string;
}

export function SectionCard({
  title,
  subtitle,
  eyebrow,
  tone = 'neutral',
  badge,
  children,
}: SectionCardProps) {
  const { colors } = useAppTheme();
  const accent = colors.sectionAccents[tone];

  return (
    <View
      className="overflow-hidden rounded-[28px] border px-5 py-5"
      style={{
        backgroundColor: colors.panel,
        borderColor: colors.border,
        shadowColor: accent.shadow,
        shadowOpacity: 1,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 2,
      }}
    >
      <View className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: accent.line }} />
      {(eyebrow || badge) ? (
        <View className="mb-3 flex-row items-start justify-between gap-3">
          {eyebrow ? (
            <View
              className="self-start rounded-full px-3 py-1.5"
              style={{ backgroundColor: accent.chipBackground }}
            >
              <Text
                className="text-[11px] uppercase tracking-[1.8px]"
                style={{ color: accent.chipColor, fontFamily: fontFamilies.sans.semibold }}
              >
                {eyebrow}
              </Text>
            </View>
          ) : (
            <View />
          )}
          {badge ? (
            <View
              className="self-start rounded-full px-2.5 py-1"
              style={{ backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border }}
            >
              <Text
                className="text-[11px]"
                style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.medium }}
              >
                {badge}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
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
