import { Pressable, Text, View } from 'react-native';
import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { LogOut, Settings2, UserCircle2 } from 'lucide-react-native';
import { useAuth, useData } from '@pocketpilot/services/src/react';
import { Screen } from '@/components/screen';
import { EmptyStateCard } from '@/components/data/empty-state-card';
import { KeyValueRow } from '@/components/data/key-value-row';
import { MetricGrid } from '@/components/data/metric-grid';
import { SectionCard } from '@/components/data/section-card';
import { StatCard } from '@/components/data/stat-card';
import { MenuRow } from '@/components/navigation/menu-row';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { ShellCard } from '@/components/navigation/shell-card';
import { StackScreenScroll } from '@/components/stack-screen-scroll';
import { useAppTheme } from '@/providers/theme-provider';
import { mobileServices } from '@/config/services';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { transactions, budgets, goals } = useData();
  const { colors } = useAppTheme();
  const [feedback, setFeedback] = useState('');

  const stats = useMemo(
    () => ({
      transactions: transactions.length,
      budgets: budgets.length,
      goals: goals.length,
    }),
    [budgets.length, goals.length, transactions.length],
  );

  async function handleSignOut() {
    const confirmed = await mobileServices.dialog.confirm(
      'You will be returned to the sign-in screen on this device.',
      'Sign out?',
    );

    if (!confirmed) {
      return;
    }

    try {
      await signOut();
      router.replace('/(auth)/signin');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Failed to sign out.');
    }
  }

  return (
    <Screen>
      <StackScreenScroll
        header={
          <ScreenHeader
            eyebrow="Profile"
            title="Account profile"
            subtitle="Profile sits outside the tab bar so the core finance destinations stay focused."
            backLabel="Go back"
          />
        }
      >
        <ShellCard
          eyebrow="Account"
          title={user?.displayName || 'PocketPilot user'}
          description={user?.email || 'Signed in'}
        >
          <View className="gap-2">
            <Text className="text-sm font-semibold" style={{ color: colors.foreground }}>
              Shared auth is active
            </Text>
            <Text className="text-sm leading-6" style={{ color: colors.mutedForeground }}>
              This profile route is powered by the same shared auth state as web, while staying fully presentation-only on mobile.
            </Text>
          </View>
        </ShellCard>

        <MetricGrid>
          <StatCard label="Transactions" value={String(stats.transactions)} detail="In your workspace" />
          <StatCard label="Budgets" value={String(stats.budgets)} detail={`${stats.goals} goals active`} />
        </MetricGrid>

        <View className="gap-3">
          <MenuRow
            title="Settings"
            description="Theme, preferences, and app-level controls"
            icon={<Settings2 size={20} color={colors.secondaryForeground} strokeWidth={2.2} />}
            onPress={() => router.push('/(app)/settings')}
          />
        </View>

        <SectionCard
          title="Profile details"
          subtitle="Current account identity from the shared auth layer."
        >
          <View className="gap-3">
            <View
              className="flex-row items-center gap-3 rounded-[22px] border px-4 py-4"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <View
                className="h-11 w-11 items-center justify-center rounded-full"
                style={{ backgroundColor: colors.secondary }}
              >
                <UserCircle2 size={20} color={colors.secondaryForeground} strokeWidth={2.2} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold" style={{ color: colors.foreground }}>
                  {user?.displayName || 'PocketPilot user'}
                </Text>
                <Text className="mt-1 text-sm leading-5" style={{ color: colors.mutedForeground }}>
                  {user?.email || 'Signed in account'}
                </Text>
              </View>
            </View>

            <KeyValueRow label="Display name" value={user?.displayName || 'Not set'} />
            <KeyValueRow label="Email" value={user?.email || 'Not available'} />
            <KeyValueRow label="Account ID" value={user?.id || 'Not available'} />
            <KeyValueRow label="Auth status" value={user ? 'Connected' : 'Signed out'} />
          </View>
        </SectionCard>

        <Pressable
          className="flex-row items-center justify-center gap-2 rounded-[20px] px-4 py-4"
          style={{ backgroundColor: colors.danger }}
          onPress={handleSignOut}
        >
          <LogOut size={18} color={colors.primaryForeground} strokeWidth={2.2} />
          <Text className="text-sm font-semibold" style={{ color: colors.primaryForeground }}>
            Sign out
          </Text>
        </Pressable>

        {feedback ? <EmptyStateCard title="Profile update" description={feedback} /> : null}
      </StackScreenScroll>
    </Screen>
  );
}
