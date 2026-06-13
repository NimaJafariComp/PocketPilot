import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useAppTheme } from "@/providers/theme-provider";
import { fontFamilies } from "@/theme/tokens";

interface DonutChartSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutChartSegment[];
  size?: number;
  strokeWidth?: number;
  centerValue?: string;
  centerLabel?: string;
}

export function DonutChart({
  data,
  size = 168,
  strokeWidth = 22,
  centerValue,
  centerLabel,
}: DonutChartProps) {
  const { colors } = useAppTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cumulative = 0;

  return (
    <View className="items-center gap-4">
      <View className="relative items-center justify-center">
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.muted}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {data.map((segment) => {
            const progress = total > 0 ? segment.value / total : 0;
            const dash = progress * circumference;
            const dashArray = `${dash} ${circumference - dash}`;
            const dashOffset = -cumulative * circumference;
            cumulative += progress;

            return (
              <Circle
                key={segment.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={segment.color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                rotation="-90"
                origin={`${size / 2}, ${size / 2}`}
              />
            );
          })}
        </Svg>
        <View className="absolute items-center justify-center px-6">
          {centerValue ? (
            <Text
              className="text-lg tracking-tight"
              style={{ color: colors.foreground, fontFamily: fontFamilies.sans.semibold }}
            >
              {centerValue}
            </Text>
          ) : null}
          {centerLabel ? (
            <Text
              className="text-[10px] uppercase tracking-[1.6px]"
              style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.medium }}
            >
              {centerLabel}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="w-full gap-2">
        {data.map((segment) => {
          const pct = total > 0 ? Math.round((segment.value / total) * 100) : 0;
          return (
            <View key={segment.label} className="flex-row items-center justify-between gap-3">
              <View className="flex-row items-center gap-2">
                <View className="h-2 w-2 rounded-full" style={{ backgroundColor: segment.color }} />
                <Text
                  className="text-sm"
                  style={{ color: colors.foreground, fontFamily: fontFamilies.sans.medium }}
                >
                  {segment.label}
                </Text>
              </View>
              <Text
                className="text-xs"
                style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.medium }}
              >
                {pct}%
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
