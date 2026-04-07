import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { MobileThemeProvider } from '@/providers/theme-provider';
import type { PropsWithChildren } from 'react';
import { ServicesProvider, AuthProvider, DataProvider } from '@pocketpilot/services/src/react';
import { mobileServices } from '@/config/services';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <MobileThemeProvider>
          <ServicesProvider services={mobileServices}>
            <AuthProvider>
              <DataProvider>
                {children}
                <Toast />
              </DataProvider>
            </AuthProvider>
          </ServicesProvider>
        </MobileThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
