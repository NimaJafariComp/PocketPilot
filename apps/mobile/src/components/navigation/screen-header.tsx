import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useAppTheme } from '@/providers/theme-provider';
import { IconButton } from '@/components/navigation/icon-button';
import type { ReactNode } from 'react';
import { fontFamilies } from '@/theme/tokens';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  backLabel?: string;
  onBackPress?: () => void;
  rightSlot?: ReactNode;
}

export function ScreenHeader({
  title,
  subtitle,
  eyebrow,
  backLabel,
  onBackPress,
  rightSlot,
}: ScreenHeaderProps) {
  const router = useRouter();
  const { colors } = useAppTheme();

  return (
    <View className="mb-6 gap-4">
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1">
          {eyebrow ? (
            <Text
              className="mb-2 text-[11px] uppercase tracking-[2px]"
              style={{ color: colors.primary, fontFamily: fontFamilies.sans.semibold }}
            >
              {eyebrow}
            </Text>
          ) : null}
          <Text
            className="text-[30px] tracking-tight"
            style={{ color: colors.foreground, fontFamily: fontFamilies.serif.semibold }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              className="mt-2 text-sm leading-6"
              style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {rightSlot}
      </View>

      {backLabel ? (
        <View className="self-start">
          <IconButton
            label={backLabel}
            onPress={() => {
              if (onBackPress) {
                onBackPress();
                return;
              }
              router.back();
            }}
            icon={<ChevronLeft size={18} color={colors.foreground} strokeWidth={2.2} />}
          />
        </View>
      ) : null}
    </View>
  );
}
