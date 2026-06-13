import { Stack } from "expo-router";
import { HeaderActions } from "@/components/navigation/header-actions";
import { largeTitleScreenOptions } from "@/lib/navigation";
import { useAppTheme } from "@/providers/theme-provider";

export default function DashboardStackLayout() {
  const { colors } = useAppTheme();

  return (
    <Stack screenOptions={largeTitleScreenOptions(colors)}>
      <Stack.Screen
        name="index"
        options={{
          title: "Dashboard",
          headerRight: () => <HeaderActions />,
        }}
      />
    </Stack>
  );
}
