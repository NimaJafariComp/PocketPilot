import { useAuth } from "@pocketpilot/services/src/react";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { MoonStar, SunMedium, Upload } from "lucide-react-native";
import { Platform, Pressable, Text, View } from "react-native";
import { hapticSelect } from "@/lib/haptics";
import { useAppTheme } from "@/providers/theme-provider";

// Bare icon buttons sized for a native UINavigationBar right slot.
export function HeaderActions() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, resolvedTheme, setThemePreference } = useAppTheme();

  const initials = (user?.displayName || user?.email || "PP")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const showingDark = resolvedTheme === "dark";

  return (
    <View className="flex-row items-center">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Import CSV"
        className="h-11 w-11 items-center justify-center"
        onPress={() => {
          hapticSelect();
          router.push("/(app)/import");
        }}
      >
        {Platform.OS === "ios" ? (
          <SymbolView
            name="square.and.arrow.up"
            tintColor={colors.tint}
            weight="medium"
            size={20}
            resizeMode="scaleAspectFit"
            fallback={<Upload size={20} color={colors.tint} strokeWidth={2} />}
          />
        ) : (
          <Upload size={20} color={colors.tint} strokeWidth={2} />
        )}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Switch to ${showingDark ? "light" : "dark"} theme`}
        className="h-11 w-11 items-center justify-center"
        onPress={() => {
          hapticSelect();
          setThemePreference(showingDark ? "light" : "dark");
        }}
      >
        {Platform.OS === "ios" ? (
          <SymbolView
            name={showingDark ? "sun.max" : "moon.stars"}
            tintColor={colors.tint}
            weight="medium"
            size={20}
            resizeMode="scaleAspectFit"
            fallback={
              showingDark ? (
                <SunMedium size={20} color={colors.tint} strokeWidth={2} />
              ) : (
                <MoonStar size={20} color={colors.tint} strokeWidth={2} />
              )
            }
          />
        ) : showingDark ? (
          <SunMedium size={20} color={colors.tint} strokeWidth={2} />
        ) : (
          <MoonStar size={20} color={colors.tint} strokeWidth={2} />
        )}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open profile"
        className="h-11 w-11 items-center justify-center"
        onPress={() => router.push("/(app)/profile")}
      >
        <View
          className="h-8 w-8 items-center justify-center rounded-full"
          style={{ backgroundColor: colors.primary }}
        >
          <Text className="text-xs font-semibold" style={{ color: colors.primaryForeground }}>
            {initials}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
