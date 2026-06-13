import { Text, View } from "react-native";
import Svg, { G, Line, Rect, Text as SvgText } from "react-native-svg";
import { useAppTheme } from "@/providers/theme-provider";
import { fontFamilies } from "@/theme/tokens";

interface VerticalBarDatum {
  name: string;
  value: number;
}

interface VerticalBarChartProps {
  data: VerticalBarDatum[];
  height?: number;
  colors?: string[];
  emptyLabel?: string;
}

export function VerticalBarChart({
  data,
  height = 220,
  colors: chartColors,
  emptyLabel = "No data",
}: VerticalBarChartProps) {
  const { colors } = useAppTheme();
  const palette = chartColors || colors.chartPalette;

  if (data.length === 0) {
    return (
      <View className="items-center justify-center py-16">
        <Text style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}>
          {emptyLabel}
        </Text>
      </View>
    );
  }

  const chartWidth = 320;
  const labelHeight = 54;
  const innerHeight = height - labelHeight;
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  const slotWidth = chartWidth / data.length;
  const barWidth = Math.min(28, slotWidth * 0.55);

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${chartWidth} ${height}`}>
      <Line
        x1="0"
        y1={innerHeight}
        x2={chartWidth}
        y2={innerHeight}
        stroke={colors.border}
        strokeWidth="1"
      />
      {data.map((item, index) => {
        const barHeight = maxValue > 0 ? (item.value / maxValue) * (innerHeight - 16) : 0;
        const x = slotWidth * index + (slotWidth - barWidth) / 2;
        const y = innerHeight - barHeight;
        const color = palette[index % palette.length];

        return (
          <G key={item.name}>
            <Rect x={x} y={y} width={barWidth} height={barHeight} rx="6" fill={color} />
            <SvgText
              x={slotWidth * index + slotWidth / 2}
              y={innerHeight + 18}
              fill={colors.mutedForeground}
              fontSize="10"
              fontFamily={fontFamilies.sans.medium}
              textAnchor="middle"
            >
              {item.name.length > 10 ? `${item.name.slice(0, 9)}…` : item.name}
            </SvgText>
            <SvgText
              x={slotWidth * index + slotWidth / 2}
              y={y - 6}
              fill={colors.mutedForeground}
              fontSize="10"
              fontFamily={fontFamilies.sans.medium}
              textAnchor="middle"
            >
              {Math.round(item.value)}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}
