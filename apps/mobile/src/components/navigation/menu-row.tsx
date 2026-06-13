import { ChevronRight } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useAppTheme } from "@/providers/theme-provider";
import { fontFamilies } from "@/theme/tokens";

interface MenuRowProps {
  title: string;
  description: string;
  icon: ReactNode;
  onPress: () => void;
  /** Hairline separator below the row; omit on the last row of a group. */
  separator?: boolean;
}

// Settings-style table row: tinted icon square, title/description, chevron.
export function MenuRow({ title, description, icon, onPress, separator = false }: MenuRowProps) {
  const { colors } = useAppTheme();

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      <View className="flex-row items-center gap-3 py-3">
        <View
          className="h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: colors.glass }}
        >
          {icon}
        </View>
        <View className="flex-1">
          <Text
            className="text-[16px]"
            style={{ color: colors.foreground, fontFamily: fontFamilies.sans.medium }}
          >
            {title}
          </Text>
          <Text
            className="mt-0.5 text-[13px] leading-4"
            style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
          >
            {description}
          </Text>
        </View>
        <ChevronRight size={17} color={colors.mutedForeground} strokeWidth={2} />
      </View>
      {separator ? (
        <View className="ml-11 h-px" style={{ backgroundColor: colors.border }} />
      ) : null}
    </Pressable>
  );
}
