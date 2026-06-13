import { Text, View } from "react-native";
import { useAppTheme } from "@/providers/theme-provider";
import { fontFamilies } from "@/theme/tokens";

interface KeyValueRowProps {
  label: string;
  value: string;
  emphasizeLabel?: boolean;
}

export function KeyValueRow({ label, value, emphasizeLabel = true }: KeyValueRowProps) {
  const { colors } = useAppTheme();

  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text
        className="text-[14px]"
        style={{
          color: emphasizeLabel ? colors.foreground : colors.mutedForeground,
          fontFamily: emphasizeLabel ? fontFamilies.sans.medium : fontFamilies.sans.regular,
        }}
      >
        {label}
      </Text>
      <Text
        className="text-[14px]"
        style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
      >
        {value}
      </Text>
    </View>
  );
}
