export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export interface CategoryBadgePalette {
  backgroundColor: string;
  color: string;
}

export type SectionTone =
  | "dashboard"
  | "transactions"
  | "goals"
  | "insights"
  | "budgets"
  | "neutral";

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
    regular: "Inter_400Regular",
    medium: "Inter_500Medium",
    semibold: "Inter_600SemiBold",
    bold: "Inter_700Bold",
  },
  // Display text now uses the same sans stack — no serif in the native design.
  serif: {
    regular: "Inter_400Regular",
    semibold: "Inter_600SemiBold",
  },
  mono: "Menlo",
} as const;

// iOS-native palette: light mode mirrors systemGroupedBackground / white cells,
// dark mode mirrors elevated dark surfaces. Accents track iOS system colors.
const light = {
  blue: "#007AFF",
  teal: "#0E7490",
  green: "#34A853",
  systemGreen: "#34C759",
  orange: "#FF9500",
  red: "#FF3B30",
  indigo: "#5856D6",
  pink: "#AF52DE",
};

const dark = {
  blue: "#0A84FF",
  teal: "#3FC2DD",
  systemGreen: "#30D158",
  orange: "#FF9F0A",
  red: "#FF453A",
  indigo: "#5E5CE6",
  pink: "#BF5AF2",
};

function accent(line: string, chipColor: string, chipBackground: string): SectionAccent {
  return {
    line,
    chipBackground,
    chipColor,
    glow: "transparent",
    shadow: "transparent",
  };
}

export const themeColors: Record<ResolvedTheme, ThemeColors> = {
  light: {
    background: "#F2F2F7",
    foreground: "#000000",
    card: "#FFFFFF",
    panel: "#FFFFFF",
    hero: "#FFFFFF",
    glass: "rgba(118, 118, 128, 0.12)",
    muted: "rgba(118, 118, 128, 0.12)",
    mutedForeground: "#8A8A8E",
    primary: light.blue,
    primaryForeground: "#FFFFFF",
    secondary: "rgba(118, 118, 128, 0.12)",
    secondaryForeground: light.blue,
    border: "rgba(60, 60, 67, 0.12)",
    success: light.systemGreen,
    warning: light.orange,
    danger: light.red,
    tint: light.blue,
    panelMuted: "#F2F2F7",
    chartPalette: [
      light.blue,
      light.teal,
      light.orange,
      light.red,
      light.indigo,
      light.systemGreen,
    ],
    goalPalette: {
      stroke: light.indigo,
      fill: "rgba(88, 86, 214, 0.12)",
      progress: light.indigo,
      complete: light.systemGreen,
      chipBackground: "rgba(88, 86, 214, 0.12)",
      chipColor: light.indigo,
    },
    sectionAccents: {
      dashboard: accent(light.blue, light.blue, "rgba(0, 122, 255, 0.10)"),
      transactions: accent(light.orange, "#C76B00", "rgba(255, 149, 0, 0.12)"),
      goals: accent(light.systemGreen, "#1F8A3D", "rgba(52, 199, 89, 0.12)"),
      insights: accent(light.indigo, light.indigo, "rgba(88, 86, 214, 0.12)"),
      budgets: accent(light.teal, light.teal, "rgba(14, 116, 144, 0.10)"),
      neutral: accent("#8A8A8E", "#6D6D72", "rgba(118, 118, 128, 0.12)"),
    },
    categoryBadgePalette: {
      Food: { backgroundColor: "rgba(255, 149, 0, 0.14)", color: "#C76B00" },
      Groceries: { backgroundColor: "rgba(255, 204, 0, 0.18)", color: "#8F7400" },
      Dining: { backgroundColor: "rgba(255, 59, 48, 0.12)", color: "#C2342B" },
      Transport: { backgroundColor: "rgba(0, 122, 255, 0.12)", color: "#0064D2" },
      Transportation: { backgroundColor: "rgba(0, 122, 255, 0.12)", color: "#0064D2" },
      Entertainment: { backgroundColor: "rgba(88, 86, 214, 0.12)", color: "#5856D6" },
      Shopping: { backgroundColor: "rgba(175, 82, 222, 0.12)", color: "#9335C0" },
      Health: { backgroundColor: "rgba(52, 199, 89, 0.14)", color: "#1F8A3D" },
      Income: { backgroundColor: "rgba(52, 199, 89, 0.14)", color: "#1F8A3D" },
      Utilities: { backgroundColor: "rgba(14, 116, 144, 0.12)", color: "#0E7490" },
      Bills: { backgroundColor: "rgba(255, 69, 58, 0.12)", color: "#C2342B" },
      Uncategorized: { backgroundColor: "rgba(118, 118, 128, 0.12)", color: "#6D6D72" },
    },
  },
  dark: {
    background: "#000000",
    foreground: "#FFFFFF",
    card: "#1C1C1E",
    panel: "#1C1C1E",
    hero: "#1C1C1E",
    glass: "rgba(118, 118, 128, 0.24)",
    muted: "rgba(118, 118, 128, 0.24)",
    mutedForeground: "#98989F",
    primary: dark.blue,
    primaryForeground: "#FFFFFF",
    secondary: "rgba(118, 118, 128, 0.24)",
    secondaryForeground: dark.blue,
    border: "rgba(84, 84, 88, 0.6)",
    success: dark.systemGreen,
    warning: dark.orange,
    danger: dark.red,
    tint: dark.blue,
    panelMuted: "#2C2C2E",
    chartPalette: [dark.blue, dark.teal, dark.orange, dark.red, dark.indigo, dark.systemGreen],
    goalPalette: {
      stroke: dark.indigo,
      fill: "rgba(94, 92, 230, 0.18)",
      progress: dark.indigo,
      complete: dark.systemGreen,
      chipBackground: "rgba(94, 92, 230, 0.18)",
      chipColor: "#B9B8F8",
    },
    sectionAccents: {
      dashboard: accent(dark.blue, "#7AB8FF", "rgba(10, 132, 255, 0.16)"),
      transactions: accent(dark.orange, "#FFC97A", "rgba(255, 159, 10, 0.16)"),
      goals: accent(dark.systemGreen, "#86E5A3", "rgba(48, 209, 88, 0.16)"),
      insights: accent(dark.indigo, "#B9B8F8", "rgba(94, 92, 230, 0.18)"),
      budgets: accent(dark.teal, "#8BDDEE", "rgba(63, 194, 221, 0.16)"),
      neutral: accent("#98989F", "#AEAEB4", "rgba(118, 118, 128, 0.24)"),
    },
    categoryBadgePalette: {
      Food: { backgroundColor: "rgba(255, 159, 10, 0.18)", color: "#FFC97A" },
      Groceries: { backgroundColor: "rgba(255, 214, 10, 0.16)", color: "#F0DA7A" },
      Dining: { backgroundColor: "rgba(255, 69, 58, 0.18)", color: "#FF9D96" },
      Transport: { backgroundColor: "rgba(10, 132, 255, 0.18)", color: "#7AB8FF" },
      Transportation: { backgroundColor: "rgba(10, 132, 255, 0.18)", color: "#7AB8FF" },
      Entertainment: { backgroundColor: "rgba(94, 92, 230, 0.2)", color: "#B9B8F8" },
      Shopping: { backgroundColor: "rgba(191, 90, 242, 0.18)", color: "#DCA8F5" },
      Health: { backgroundColor: "rgba(48, 209, 88, 0.16)", color: "#86E5A3" },
      Income: { backgroundColor: "rgba(48, 209, 88, 0.16)", color: "#86E5A3" },
      Utilities: { backgroundColor: "rgba(63, 194, 221, 0.16)", color: "#8BDDEE" },
      Bills: { backgroundColor: "rgba(255, 69, 58, 0.18)", color: "#FF9D96" },
      Uncategorized: { backgroundColor: "rgba(118, 118, 128, 0.24)", color: "#AEAEB4" },
    },
  },
};
