import { Tabs } from 'expo-router';
import {
  ChartNoAxesCombined,
  ChartPie,
  House,
  Receipt,
  Target,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/providers/theme-provider';

function TabIcon({
  color,
  size,
  name,
}: {
  color: string;
  size: number;
  name: 'dashboard' | 'transactions' | 'budgets' | 'goals' | 'insights';
}) {
  const props = { color, size, strokeWidth: 2.2 };

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

export default function TabsLayout() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 74,
          paddingHorizontal: Math.max(8, insets.left + 4, insets.right + 4),
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarItemStyle: {
          paddingHorizontal: 0,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '600',
          letterSpacing: -0.1,
        },
        tabBarIcon: ({ color, size }) => (
          <TabIcon color={color} size={size} name={route.name as Parameters<typeof TabIcon>[0]['name']} />
        ),
      })}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="transactions" options={{ title: 'Transactions' }} />
      <Tabs.Screen name="budgets" options={{ title: 'Budgets' }} />
      <Tabs.Screen name="goals" options={{ title: 'Goals' }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
    </Tabs>
  );
}
