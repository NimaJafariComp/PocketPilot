import { Text, View } from 'react-native';
import { useAppTheme } from '@/providers/theme-provider';
import type { DimensionValue } from 'react-native';

interface ProgressMeterProps {
  value: number;
  color?: string;
  label?: string;
}

export function ProgressMeter({ value, color, label }: ProgressMeterProps) {
  const { colors } = useAppTheme();
  const width = `${Math.max(0, Math.min(100, value))}%` as DimensionValue;

  return (
    <View className="gap-2">
      <View className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: colors.muted }}>
        <View
          className="h-full rounded-full"
          style={{
            width,
            backgroundColor: color || colors.primary,
          }}
        />
      </View>
      {label ? (
        <Text className="text-xs leading-5" style={{ color: colors.mutedForeground }}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}
