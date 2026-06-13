import { Text, View } from "react-native";
import { useAppTheme } from "@/providers/theme-provider";
import { fontFamilies } from "@/theme/tokens";

interface HorizontalBarDatum {
  name: string;
  value: number;
  color?: string;
}

interface HorizontalBarChartProps {
  data: HorizontalBarDatum[];
  maxValue?: number;
  formatter?: (value: number) => string;
}

export function HorizontalBarChart({
  data,
  maxValue = Math.max(...data.map((item) => item.value), 1),
  formatter = (value) => `$${Math.round(value).toLocaleString()}`,
}: HorizontalBarChartProps) {
  const { colors } = useAppTheme();

  return (
    <View className="gap-3.5">
      {data.map((item, index) => {
        const width = maxValue > 0 ? Math.max(8, (item.value / maxValue) * 100) : 0;
        const color = item.color || colors.chartPalette[index % colors.chartPalette.length];

        return (
          <View key={item.name} className="gap-1.5">
            <View className="flex-row items-baseline justify-between gap-3">
              <Text
                className="flex-1 text-sm"
                style={{ color: colors.foreground, fontFamily: fontFamilies.sans.semibold }}
              >
                {item.name}
              </Text>
              <Text
                className="text-xs"
                style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.medium }}
              >
                {formatter(item.value)}
              </Text>
            </View>
            <View
              className="h-2 overflow-hidden rounded-full"
              style={{ backgroundColor: colors.muted }}
            >
              <View
                className="h-full rounded-full"
                style={{ width: `${width}%`, backgroundColor: color }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}
