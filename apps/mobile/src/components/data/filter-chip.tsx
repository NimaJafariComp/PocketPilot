import { Pressable, Text } from "react-native";
import { hapticSelect } from "@/lib/haptics";
import { useAppTheme } from "@/providers/theme-provider";
import { fontFamilies } from "@/theme/tokens";

interface FilterChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

// Segmented-style pill: tint-filled when active, quaternary fill otherwise.
export function FilterChip({ label, active, onPress }: FilterChipProps) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      className="h-[34px] items-center justify-center rounded-full px-4"
      style={{ backgroundColor: active ? colors.tint : colors.glass }}
      hitSlop={6}
      onPress={() => {
        hapticSelect();
        onPress();
      }}
    >
      <Text
        className="text-[13px]"
        style={{
          color: active ? colors.primaryForeground : colors.foreground,
          fontFamily: fontFamilies.sans.medium,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
