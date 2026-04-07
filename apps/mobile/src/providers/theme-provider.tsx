import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { themeColors, type ResolvedTheme, type ThemeColors, type ThemePreference } from '@/theme/tokens';

const THEME_STORAGE_KEY = 'pocketpilot-mobile-theme';

interface ThemeContextValue {
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  colors: ThemeColors;
  setThemePreference: (nextTheme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function MobileThemeProvider({ children }: PropsWithChildren) {
  const systemTheme = useColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');

  const resolvedTheme: ResolvedTheme =
    themePreference === 'system' ? (systemTheme === 'dark' ? 'dark' : 'light') : themePreference;

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((storedValue) => {
        if (storedValue === 'light' || storedValue === 'dark' || storedValue === 'system') {
          setThemePreferenceState(storedValue);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(themeColors[resolvedTheme].background).catch(() => {});
  }, [resolvedTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themePreference,
      resolvedTheme,
      colors: themeColors[resolvedTheme],
      setThemePreference(nextTheme) {
        setThemePreferenceState(nextTheme);
        void AsyncStorage.setItem(THEME_STORAGE_KEY, nextTheme).catch(() => {});
      },
    }),
    [resolvedTheme, themePreference],
  );

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within MobileThemeProvider');
  }
  return context;
}
