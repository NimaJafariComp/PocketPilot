import type { PropsWithChildren, ReactNode } from "react";
import { Text, View } from "react-native";
import { useAppTheme } from "@/providers/theme-provider";
import { fontFamilies } from "@/theme/tokens";

export function EmptyStateCard({
  title,
  description,
  icon,
  children,
}: PropsWithChildren<{ title: string; description: string; icon?: ReactNode }>) {
  const { colors } = useAppTheme();

  return (
    <View className="items-center rounded-xl px-6 py-8" style={{ backgroundColor: colors.card }}>
      {icon ? (
        <View className="mb-3 items-center justify-center opacity-40">{icon}</View>
      ) : null}
      <Text
        className="text-center text-[16px]"
        style={{ color: colors.foreground, fontFamily: fontFamilies.sans.semibold }}
      >
        {title}
      </Text>
      <Text
        className="mt-1 text-center text-[14px] leading-5"
        style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
      >
        {description}
      </Text>
      {children ? <View className="mt-4 items-center">{children}</View> : null}
    </View>
  );
}
