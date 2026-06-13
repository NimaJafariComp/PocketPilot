import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { ChartNoAxesCombined, ChartPie, House, Receipt, Target } from "lucide-react-native";
import { Platform, StyleSheet, View } from "react-native";
import { hapticSelect } from "@/lib/haptics";
import { useAppTheme } from "@/providers/theme-provider";

type TabName = "dashboard" | "transactions" | "budgets" | "goals" | "insights";

const SF_SYMBOLS: Record<TabName, SymbolViewProps["name"]> = {
  dashboard: "house.fill",
  transactions: "list.bullet.rectangle.fill",
  budgets: "chart.pie.fill",
  goals: "target",
  insights: "chart.line.uptrend.xyaxis",
};

function LucideFallback({ name, color, size }: { name: TabName; color: string; size: number }) {
  const props = { color, size, strokeWidth: 2 };

  switch (name) {
    case "dashboard":
      return <House {...props} />;
    case "transactions":
      return <Receipt {...props} />;
    case "budgets":
      return <ChartPie {...props} />;
    case "goals":
      return <Target {...props} />;
    case "insights":
      return <ChartNoAxesCombined {...props} />;
  }
}

function TabIcon({ color, name, size }: { color: string; name: TabName; size: number }) {
  if (Platform.OS === "ios") {
    return (
      <SymbolView
        name={SF_SYMBOLS[name]}
        tintColor={color}
        style={{ width: size, height: size }}
        fallback={<LucideFallback name={name} color={color} size={size} />}
      />
    );
  }

  return <LucideFallback name={name} color={color} size={size} />;
}

export default function TabsLayout() {
  const { colors, resolvedTheme } = useAppTheme();
  const isIOS = Platform.OS === "ios";

  return (
    <Tabs
      screenListeners={{
        tabPress: () => hapticSelect(),
      }}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarHideOnKeyboard: true,
        tabBarLabelPosition: "below-icon",
        tabBarStyle: isIOS
          ? {
              position: "absolute",
              right: 0,
              bottom: 0,
              left: 0,
              height: 84,
              paddingTop: 8,
              paddingBottom: 26,
              backgroundColor: "transparent",
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor:
                resolvedTheme === "dark"
                  ? "rgba(255, 255, 255, 0.16)"
                  : "rgba(60, 60, 67, 0.18)",
            }
          : {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
            },
        tabBarBackground: isIOS
          ? () => (
              <BlurView
                tint={
                  resolvedTheme === "dark" ? "systemChromeMaterialDark" : "systemChromeMaterial"
                }
                intensity={100}
                style={StyleSheet.absoluteFill}
              >
                <View
                  style={[
                    styles.glassTint,
                    {
                      backgroundColor:
                        resolvedTheme === "dark"
                          ? "rgba(28, 28, 30, 0.34)"
                          : "rgba(255, 255, 255, 0.44)",
                    },
                  ]}
                />
                <View style={styles.glassHighlight} />
              </BlurView>
            )
          : () => <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />,
        tabBarIcon: ({ color, size }) => (
          <TabIcon color={color} size={Math.min(size, 24)} name={route.name as TabName} />
        ),
        tabBarIconStyle: isIOS ? styles.tabBarIcon : undefined,
        tabBarLabelStyle: isIOS ? styles.tabBarLabel : undefined,
      })}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Home" }} />
      <Tabs.Screen name="transactions" options={{ title: "Activity" }} />
      <Tabs.Screen name="budgets" options={{ title: "Budgets" }} />
      <Tabs.Screen name="goals" options={{ title: "Goals" }} />
      <Tabs.Screen name="insights" options={{ title: "Insights" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  glassHighlight: {
    position: "absolute",
    top: 1,
    right: 0,
    left: 0,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.36)",
  },
  glassTint: {
    ...StyleSheet.absoluteFillObject,
  },
  tabBarIcon: {
    marginTop: 2,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
});
