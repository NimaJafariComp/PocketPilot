import 'react-native-gesture-handler';
import '@/styles/global.css';

import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { PlayfairDisplay_400Regular, PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display';
import { AppProviders } from '@/providers/app-providers';
import { useAppTheme } from '@/providers/theme-provider';
import { BootScreen } from '@/components/boot-screen';

function RootNavigator() {
  const { colors, resolvedTheme } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
        animation: resolvedTheme === 'dark' ? 'fade' : 'default',
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
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
  });

  return (
    <AppProviders>
      {fontsLoaded ? <RootNavigator /> : <BootScreen message="Loading the mobile design system." />}
    </AppProviders>
  );
}
