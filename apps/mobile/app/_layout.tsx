import 'react-native-gesture-handler';
import '@/styles/global.css';

import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { AppProviders } from '@/providers/app-providers';
import { useAppTheme } from '@/providers/theme-provider';
import { BootScreen } from '@/components/boot-screen';

function RootNavigator() {
  const { colors } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    />
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  return (
    <AppProviders>
      {fontsLoaded ? <RootNavigator /> : <BootScreen message="Loading PocketPilot." />}
    </AppProviders>
  );
}
