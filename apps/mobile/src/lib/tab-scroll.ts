import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Platform } from "react-native";

// The iOS tab bar floats (blur over content), so scrollable tab screens need
// to pad their content past it. Android keeps a solid, in-layout tab bar.
export function useTabScrollPadding(extra = 24) {
  const tabBarHeight = useBottomTabBarHeight();
  return Platform.OS === "ios" ? tabBarHeight + extra : extra + 8;
}
