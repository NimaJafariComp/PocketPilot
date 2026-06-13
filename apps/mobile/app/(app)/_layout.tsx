import { useAuth } from "@pocketpilot/services/src/react";
import { Redirect, Stack } from "expo-router";
import { BootScreen } from "@/components/boot-screen";
import { largeTitleScreenOptions, modalScreenOptions } from "@/lib/navigation";
import { useAppTheme } from "@/providers/theme-provider";

export default function AppLayout() {
  const { user, loading } = useAuth();
  const { colors } = useAppTheme();

  if (loading) {
    return <BootScreen message="Restoring your account and preparing live financial data." />;
  }

  if (!user) {
    return <Redirect href="/(auth)/signin" />;
  }

  const modal = modalScreenOptions(colors);

  return (
    <Stack screenOptions={largeTitleScreenOptions(colors)}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ title: "Profile", headerLargeTitle: false }} />
      <Stack.Screen name="settings" options={{ title: "Settings", headerLargeTitle: false }} />
      <Stack.Screen name="transactions/new" options={{ ...modal, title: "New Transaction" }} />
      <Stack.Screen name="transactions/filters" options={{ ...modal, title: "Filters" }} />
      <Stack.Screen
        name="transactions/[transactionId]"
        options={{ ...modal, title: "Edit Transaction" }}
      />
      <Stack.Screen name="budgets/new" options={{ ...modal, title: "New Budget" }} />
      <Stack.Screen name="budgets/[budgetId]" options={{ ...modal, title: "Edit Budget" }} />
      <Stack.Screen name="goals/new" options={{ ...modal, title: "New Goal" }} />
      <Stack.Screen
        name="goals/[goalId]/contribute"
        options={{ ...modal, title: "Add Contribution" }}
      />
      <Stack.Screen name="import" options={{ ...modal, title: "Import Transactions" }} />
    </Stack>
  );
}
