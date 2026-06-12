import { Pressable, Text, View } from 'react-native';
import { AlertTriangle, Info } from 'lucide-react-native';
import { useAppTheme } from '@/providers/theme-provider';
import { fontFamilies } from '@/theme/tokens';
import type { ReactNode } from 'react';

interface AlertBannerProps {
  tone: 'danger' | 'warning' | 'neutral';
  message: string;
  actionLabel?: string;
  onActionPress?: () => void;
  icon?: ReactNode;
}

export function AlertBanner({
  tone,
  message,
  actionLabel,
  onActionPress,
  icon,
}: AlertBannerProps) {
  const { colors, resolvedTheme } = useAppTheme();
  const isDark = resolvedTheme === 'dark';

  const palette =
    tone === 'danger'
      ? {
          backgroundColor: isDark ? 'rgba(255, 69, 58, 0.16)' : 'rgba(255, 59, 48, 0.10)',
          color: colors.danger,
        }
      : tone === 'warning'
        ? {
            backgroundColor: isDark ? 'rgba(255, 159, 10, 0.16)' : 'rgba(255, 149, 0, 0.12)',
            color: isDark ? colors.warning : '#C76B00',
          }
        : {
            backgroundColor: colors.card,
            color: colors.foreground,
          };

  return (
    <View className="flex-row items-center gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: palette.backgroundColor }}>
      {icon ||
        (tone === 'danger' ? (
          <AlertTriangle size={18} color={palette.color} strokeWidth={2} />
        ) : (
          <Info size={18} color={palette.color} strokeWidth={2} />
        ))}
      <Text
        className="flex-1 text-[14px] leading-5"
        style={{ color: palette.color, fontFamily: fontFamilies.sans.medium }}
      >
        {message}
      </Text>
      {actionLabel && onActionPress ? (
        <Pressable onPress={onActionPress} hitSlop={8}>
          <Text
            className="text-[14px]"
            style={{ color: colors.tint, fontFamily: fontFamilies.sans.semibold }}
          >
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
