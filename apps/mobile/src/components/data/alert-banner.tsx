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

  const palette =
    tone === 'danger'
      ? {
          borderColor: resolvedTheme === 'dark' ? 'rgba(255, 122, 136, 0.24)' : 'rgba(220, 73, 96, 0.22)',
          backgroundColor: resolvedTheme === 'dark' ? 'rgba(255, 122, 136, 0.08)' : 'rgba(220, 73, 96, 0.08)',
          color: colors.danger,
        }
      : tone === 'warning'
        ? {
            borderColor: resolvedTheme === 'dark' ? 'rgba(246, 199, 104, 0.22)' : 'rgba(213, 155, 47, 0.24)',
            backgroundColor: resolvedTheme === 'dark' ? 'rgba(246, 199, 104, 0.08)' : 'rgba(213, 155, 47, 0.1)',
            color: colors.warning,
          }
        : {
            borderColor: colors.border,
            backgroundColor: colors.muted,
            color: colors.foreground,
          };

  return (
    <View
      className="flex-row items-start gap-3 rounded-[22px] border px-4 py-3"
      style={palette}
    >
      <View className="pt-0.5">
        {icon ||
          (tone === 'danger' ? (
            <AlertTriangle size={16} color={palette.color} strokeWidth={2.2} />
          ) : (
            <Info size={16} color={palette.color} strokeWidth={2.2} />
          ))}
      </View>
      <Text
        className="flex-1 text-sm leading-6"
        style={{ color: palette.color, fontFamily: fontFamilies.sans.medium }}
      >
        {message}
      </Text>
      {actionLabel && onActionPress ? (
        <Pressable onPress={onActionPress}>
          <Text
            className="text-xs underline"
            style={{ color: palette.color, fontFamily: fontFamilies.sans.semibold }}
          >
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
