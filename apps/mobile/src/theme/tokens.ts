export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export interface CategoryBadgePalette {
  backgroundColor: string;
  color: string;
}

export type SectionTone = 'dashboard' | 'transactions' | 'goals' | 'insights' | 'budgets' | 'neutral';

export interface SectionAccent {
  line: string;
  chipBackground: string;
  chipColor: string;
  glow: string;
  shadow: string;
}

export interface GoalPalette {
  stroke: string;
  fill: string;
  progress: string;
  complete: string;
  chipBackground: string;
  chipColor: string;
}

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  panel: string;
  hero: string;
  glass: string;
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
  panelMuted: string;
  chartPalette: string[];
  goalPalette: GoalPalette;
  sectionAccents: Record<SectionTone, SectionAccent>;
  categoryBadgePalette: Record<string, CategoryBadgePalette>;
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
    background: '#E7DBC8',
    foreground: '#1D2A36',
    card: '#FFF8EE',
    panel: '#FAF1E4',
    hero: '#E9DDCB',
    glass: 'rgba(255, 250, 242, 0.74)',
    muted: '#E6DCCB',
    mutedForeground: '#6A6F7D',
    primary: '#245F71',
    primaryForeground: '#F8FBFF',
    secondary: '#D8CCBA',
    secondaryForeground: '#294158',
    border: 'rgba(29, 42, 54, 0.14)',
    success: '#2E8F70',
    warning: '#BB7C45',
    danger: '#C85A5A',
    tint: '#183248',
    panelMuted: '#F1E7D7',
    chartPalette: ['#245F71', '#5A897F', '#BB7C45', '#A15450', '#7A769F', '#6C948C'],
    goalPalette: {
      stroke: '#8A4F74',
      fill: 'rgba(138, 79, 116, 0.14)',
      progress: '#8A4F74',
      complete: '#B26A3F',
      chipBackground: 'rgba(138, 79, 116, 0.12)',
      chipColor: '#7A4366',
    },
    sectionAccents: {
      dashboard: {
        line: '#245F71',
        chipBackground: 'rgba(36, 95, 113, 0.12)',
        chipColor: '#245F71',
        glow: 'rgba(36, 95, 113, 0.12)',
        shadow: 'rgba(36, 95, 113, 0.08)',
      },
      transactions: {
        line: '#8F582A',
        chipBackground: 'rgba(187, 124, 69, 0.14)',
        chipColor: '#8F582A',
        glow: 'rgba(187, 124, 69, 0.12)',
        shadow: 'rgba(187, 124, 69, 0.08)',
      },
      goals: {
        line: '#2E8F70',
        chipBackground: 'rgba(46, 143, 112, 0.14)',
        chipColor: '#246F56',
        glow: 'rgba(46, 143, 112, 0.12)',
        shadow: 'rgba(46, 143, 112, 0.08)',
      },
      insights: {
        line: '#6D6AA8',
        chipBackground: 'rgba(109, 106, 168, 0.14)',
        chipColor: '#57548F',
        glow: 'rgba(109, 106, 168, 0.12)',
        shadow: 'rgba(109, 106, 168, 0.08)',
      },
      budgets: {
        line: '#BB7C45',
        chipBackground: 'rgba(187, 124, 69, 0.14)',
        chipColor: '#8F582A',
        glow: 'rgba(187, 124, 69, 0.12)',
        shadow: 'rgba(187, 124, 69, 0.08)',
      },
      neutral: {
        line: '#72978F',
        chipBackground: 'rgba(114, 151, 143, 0.14)',
        chipColor: '#4B746C',
        glow: 'rgba(114, 151, 143, 0.12)',
        shadow: 'rgba(29, 42, 54, 0.06)',
      },
    },
    categoryBadgePalette: {
      Food: { backgroundColor: 'rgba(187, 124, 69, 0.16)', color: '#8F582A' },
      Groceries: { backgroundColor: 'rgba(173, 142, 84, 0.16)', color: '#7C6331' },
      Dining: { backgroundColor: 'rgba(196, 109, 74, 0.16)', color: '#9A542C' },
      Transport: { backgroundColor: 'rgba(61, 110, 153, 0.16)', color: '#2A5E84' },
      Transportation: { backgroundColor: 'rgba(61, 110, 153, 0.16)', color: '#2A5E84' },
      Entertainment: { backgroundColor: 'rgba(109, 106, 168, 0.16)', color: '#57548F' },
      Shopping: { backgroundColor: 'rgba(168, 84, 80, 0.16)', color: '#8F4947' },
      Health: { backgroundColor: 'rgba(46, 143, 112, 0.16)', color: '#246F56' },
      Income: { backgroundColor: 'rgba(46, 143, 112, 0.16)', color: '#246F56' },
      Utilities: { backgroundColor: 'rgba(114, 151, 143, 0.16)', color: '#4B746C' },
      Bills: { backgroundColor: 'rgba(200, 90, 90, 0.14)', color: '#964747' },
      Uncategorized: { backgroundColor: 'rgba(106, 111, 125, 0.14)', color: '#575D69' },
    },
  },
  dark: {
    background: '#07111A',
    foreground: '#EDF4F1',
    card: '#0C1823',
    panel: '#10202B',
    hero: '#0A1623',
    glass: 'rgba(16, 31, 41, 0.72)',
    muted: '#101E2A',
    mutedForeground: '#95A5AD',
    primary: '#79D0C2',
    primaryForeground: '#07111A',
    secondary: '#142430',
    secondaryForeground: '#DFECE8',
    border: 'rgba(139, 178, 180, 0.16)',
    success: '#4AC79E',
    warning: '#D8A267',
    danger: '#E58283',
    tint: '#EEF7F5',
    panelMuted: '#112230',
    chartPalette: ['#79D0C2', '#6EA7C8', '#D8A267', '#C98B97', '#8D86D9', '#8EB9AB'],
    goalPalette: {
      stroke: '#C98AB2',
      fill: 'rgba(201, 138, 178, 0.14)',
      progress: '#C98AB2',
      complete: '#F0B36B',
      chipBackground: 'rgba(201, 138, 178, 0.16)',
      chipColor: '#F3CAE0',
    },
    sectionAccents: {
      dashboard: {
        line: '#79D0C2',
        chipBackground: 'rgba(121, 208, 194, 0.16)',
        chipColor: '#B4ECE4',
        glow: 'rgba(121, 208, 194, 0.14)',
        shadow: 'rgba(10, 26, 37, 0.42)',
      },
      transactions: {
        line: '#D8A267',
        chipBackground: 'rgba(216, 162, 103, 0.18)',
        chipColor: '#F1C48A',
        glow: 'rgba(216, 162, 103, 0.14)',
        shadow: 'rgba(10, 26, 37, 0.42)',
      },
      goals: {
        line: '#4AC79E',
        chipBackground: 'rgba(74, 199, 158, 0.18)',
        chipColor: '#A6E7CB',
        glow: 'rgba(74, 199, 158, 0.14)',
        shadow: 'rgba(10, 26, 37, 0.42)',
      },
      insights: {
        line: '#8D86D9',
        chipBackground: 'rgba(141, 134, 217, 0.18)',
        chipColor: '#C4BFF5',
        glow: 'rgba(141, 134, 217, 0.14)',
        shadow: 'rgba(10, 26, 37, 0.42)',
      },
      budgets: {
        line: '#D8A267',
        chipBackground: 'rgba(216, 162, 103, 0.18)',
        chipColor: '#F1C48A',
        glow: 'rgba(216, 162, 103, 0.14)',
        shadow: 'rgba(10, 26, 37, 0.42)',
      },
      neutral: {
        line: '#88B9A0',
        chipBackground: 'rgba(136, 185, 160, 0.16)',
        chipColor: '#B9E0CC',
        glow: 'rgba(136, 185, 160, 0.14)',
        shadow: 'rgba(10, 26, 37, 0.42)',
      },
    },
    categoryBadgePalette: {
      Food: { backgroundColor: 'rgba(216, 162, 103, 0.18)', color: '#F1C48A' },
      Groceries: { backgroundColor: 'rgba(136, 185, 160, 0.18)', color: '#B9E0CC' },
      Dining: { backgroundColor: 'rgba(229, 130, 131, 0.18)', color: '#F0B0AF' },
      Transport: { backgroundColor: 'rgba(110, 167, 200, 0.18)', color: '#A9D1E7' },
      Transportation: { backgroundColor: 'rgba(110, 167, 200, 0.18)', color: '#A9D1E7' },
      Entertainment: { backgroundColor: 'rgba(141, 134, 217, 0.18)', color: '#C4BFF5' },
      Shopping: { backgroundColor: 'rgba(229, 130, 131, 0.18)', color: '#F0B0AF' },
      Health: { backgroundColor: 'rgba(74, 199, 158, 0.18)', color: '#A6E7CB' },
      Income: { backgroundColor: 'rgba(74, 199, 158, 0.18)', color: '#A6E7CB' },
      Utilities: { backgroundColor: 'rgba(121, 208, 194, 0.16)', color: '#AEE8DE' },
      Bills: { backgroundColor: 'rgba(216, 162, 103, 0.18)', color: '#F1C48A' },
      Uncategorized: { backgroundColor: 'rgba(149, 165, 173, 0.16)', color: '#C8D3D8' },
    },
  },
};
