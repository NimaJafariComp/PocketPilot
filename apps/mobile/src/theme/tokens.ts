export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  muted: string;
  mutedForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  tint: string;
}

export const fontFamilies = {
  sans: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
  serif: {
    regular: 'PlayfairDisplay_400Regular',
    semibold: 'PlayfairDisplay_600SemiBold',
  },
  mono: 'Courier',
} as const;

export const themeColors: Record<ResolvedTheme, ThemeColors> = {
  light: {
    background: '#F4F5F7',
    foreground: '#142033',
    card: '#FFFFFF',
    muted: '#EDF2FB',
    mutedForeground: '#62718B',
    primary: '#2B67F6',
    primaryForeground: '#F8FBFF',
    secondary: '#E8EEFC',
    secondaryForeground: '#183153',
    border: 'rgba(14, 25, 42, 0.10)',
    success: '#1F9D72',
    warning: '#D59B2F',
    danger: '#DC4960',
    tint: '#0B1730',
  },
  dark: {
    background: '#08111F',
    foreground: '#EDF3FF',
    card: '#0E1A2D',
    muted: '#102035',
    mutedForeground: '#91A1BF',
    primary: '#7AB6FF',
    primaryForeground: '#08111F',
    secondary: '#13233B',
    secondaryForeground: '#DFE9FF',
    border: 'rgba(143, 160, 193, 0.18)',
    success: '#33D1A1',
    warning: '#F6C768',
    danger: '#FF7A88',
    tint: '#EEF4FF',
  },
};
