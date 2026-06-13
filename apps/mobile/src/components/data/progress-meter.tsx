import type { DimensionValue } from "react-native";
import { Text, View } from "react-native";
import { useAppTheme } from "@/providers/theme-provider";
import { fontFamilies } from "@/theme/tokens";

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
        <Text
          className="text-[12px] leading-5"
          style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}
