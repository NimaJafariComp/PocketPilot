import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import {
  ChartNoAxesCombined,
  ChartPie,
  House,
  Receipt,
  Target,
} from 'lucide-react-native';
import { useAppTheme } from '@/providers/theme-provider';
import { hapticSelect } from '@/lib/haptics';

type TabName = 'dashboard' | 'transactions' | 'budgets' | 'goals' | 'insights';

const SF_SYMBOLS: Record<TabName, SymbolViewProps['name']> = {
  dashboard: 'house.fill',
  transactions: 'list.bullet.rectangle.fill',
  budgets: 'chart.pie.fill',
  goals: 'target',
  insights: 'chart.line.uptrend.xyaxis',
};

function LucideFallback({ name, color, size }: { name: TabName; color: string; size: number }) {
  const props = { color, size, strokeWidth: 2 };

  switch (name) {
    case 'dashboard':
      return <House {...props} />;
    case 'transactions':
      return <Receipt {...props} />;
    case 'budgets':
      return <ChartPie {...props} />;
    case 'goals':
      return <Target {...props} />;
    case 'insights':
      return <ChartNoAxesCombined {...props} />;
  }
}

function TabIcon({ color, size, name }: { color: string; size: number; name: TabName }) {
  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        name={SF_SYMBOLS[name]}
        tintColor={color}
        style={{ width: size, height: size }}
        fallback={<LucideFallback name={name} color={color} size={size} />}
      />
    );
  }

  return <LucideFallback name={name} color={color} size={size} />;
}

export default function TabsLayout() {
  const { colors, resolvedTheme } = useAppTheme();
  const isIOS = Platform.OS === 'ios';

  return (
    <Tabs
      screenListeners={{
        tabPress: () => hapticSelect(),
      }}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: isIOS
          ? {
              position: 'absolute',
              backgroundColor: 'transparent',
              borderTopColor: colors.border,
            }
          : {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
            },
        tabBarBackground: isIOS
          ? () => (
              <BlurView
                tint={resolvedTheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterial'}
                intensity={100}
                style={StyleSheet.absoluteFill}
              />
            )
          : () => <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />,
        tabBarIcon: ({ color, size }) => (
          <TabIcon color={color} size={size} name={route.name as TabName} />
        ),
      })}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Home' }} />
      <Tabs.Screen name="transactions" options={{ title: 'Activity' }} />
      <Tabs.Screen name="budgets" options={{ title: 'Budgets' }} />
      <Tabs.Screen name="goals" options={{ title: 'Goals' }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
    </Tabs>
  );
}
