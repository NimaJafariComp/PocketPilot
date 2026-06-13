import { ActivityIndicator, Text, View } from "react-native";
import { Screen } from "@/components/screen";
import { useAppTheme } from "@/providers/theme-provider";

interface BootScreenProps {
  title?: string;
  message?: string;
}

export function BootScreen({
  title = "Preparing PocketPilot",
  message = "Loading your secure workspace and syncing account state.",
}: BootScreenProps) {
  const { colors } = useAppTheme();

  return (
    <Screen>
      <View
        className="flex-1 items-center justify-center rounded-2xl border px-8"
        style={{
          backgroundColor: colors.card,
          borderColor: colors.border,
        }}
      >
        <ActivityIndicator size="small" color={colors.primary} />
        <Text
          className="mt-6 text-2xl font-semibold text-center"
          style={{ color: colors.foreground }}
        >
          {title}
        </Text>
        <Text
          className="mt-3 text-center text-sm leading-6"
          style={{ color: colors.mutedForeground }}
        >
          {message}
        </Text>
      </View>
    </Screen>
  );
}
