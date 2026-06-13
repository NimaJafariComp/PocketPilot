import { useAuth } from "@pocketpilot/services/src/react";
import { Redirect, Stack } from "expo-router";
import { BootScreen } from "@/components/boot-screen";

export default function AuthLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return <BootScreen />;
  }

  if (user) {
    return <Redirect href="/(app)/(tabs)/dashboard" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    />
  );
}
