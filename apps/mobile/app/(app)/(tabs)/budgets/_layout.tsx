import { Stack } from "expo-router";
import { HeaderActions } from "@/components/navigation/header-actions";
import { largeTitleScreenOptions } from "@/lib/navigation";
import { useAppTheme } from "@/providers/theme-provider";

export default function BudgetsStackLayout() {
  const { colors } = useAppTheme();

  return (
    <Stack screenOptions={largeTitleScreenOptions(colors)}>
      <Stack.Screen
        name="index"
        options={{
          title: "Budgets",
          headerRight: () => <HeaderActions />,
        }}
      />
    </Stack>
  );
}
