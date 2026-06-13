import { Text, View } from "react-native";
import { ProgressMeter } from "@/components/data/progress-meter";
import { useAppTheme } from "@/providers/theme-provider";
import { fontFamilies } from "@/theme/tokens";

interface ProgressSummaryRowProps {
  title: string;
  value: string;
  progress: number;
  progressLabel: string;
  color?: string;
}

export function ProgressSummaryRow({
  title,
  value,
  progress,
  progressLabel,
  color,
}: ProgressSummaryRowProps) {
  const { colors } = useAppTheme();

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text
          className="text-[14px]"
          style={{ color: colors.foreground, fontFamily: fontFamilies.sans.semibold }}
        >
          {title}
        </Text>
        <Text
          className="text-[14px]"
          style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
        >
          {value}
        </Text>
      </View>
      <ProgressMeter value={progress} color={color} label={progressLabel} />
    </View>
  );
}
