import { Stack } from "expo-router";
import { largeTitleScreenOptions } from "@/lib/navigation";
import { useAppTheme } from "@/providers/theme-provider";

export default function TransactionsStackLayout() {
  const { colors } = useAppTheme();

  return (
    <Stack screenOptions={largeTitleScreenOptions(colors)}>
      <Stack.Screen
        name="index"
        options={{
          title: "Transactions",
        }}
      />
    </Stack>
  );
}
