import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import type { ThemeColors } from "@/theme/tokens";

// System-font native headers (UINavigationBar). Large titles collapse on
// scroll when paired with contentInsetAdjustmentBehavior="automatic".
export function largeTitleScreenOptions(colors: ThemeColors): NativeStackNavigationOptions {
  return {
    headerLargeTitle: true,
    headerLargeTitleShadowVisible: false,
    headerShadowVisible: false,
    headerTransparent: false,
    headerStyle: { backgroundColor: colors.background },
    headerLargeStyle: { backgroundColor: colors.background },
    headerTintColor: colors.tint,
    headerTitleStyle: { color: colors.foreground },
    headerLargeTitleStyle: { color: colors.foreground },
    contentStyle: { backgroundColor: colors.background },
  };
}

export function modalScreenOptions(colors: ThemeColors): NativeStackNavigationOptions {
  return {
    headerShadowVisible: false,
    headerStyle: { backgroundColor: colors.card },
    headerTintColor: colors.tint,
    headerTitleStyle: { color: colors.foreground },
    contentStyle: { backgroundColor: colors.background },
    presentation: "modal",
  };
}
