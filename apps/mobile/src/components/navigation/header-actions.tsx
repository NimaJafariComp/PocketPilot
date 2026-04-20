import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MoonStar, SunMedium } from 'lucide-react-native';
import { useAuth } from '@pocketpilot/services/src/react';
import { useAppTheme } from '@/providers/theme-provider';

export function HeaderActions() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, resolvedTheme, setThemePreference } = useAppTheme();

  const initials = (user?.displayName || user?.email || 'PP')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const showingDark = resolvedTheme === 'dark';

  return (
    <View className="flex-row items-center gap-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Switch to ${showingDark ? 'light' : 'dark'} theme`}
        className="h-10 w-10 items-center justify-center rounded-full border"
        onPress={() => setThemePreference(showingDark ? 'light' : 'dark')}
        style={{
          backgroundColor: colors.glass,
          borderColor: colors.border,
        }}
      >
        {showingDark ? (
          <SunMedium size={16} color={colors.foreground} strokeWidth={2.2} />
        ) : (
          <MoonStar size={16} color={colors.foreground} strokeWidth={2.2} />
        )}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open profile"
        className="h-11 w-11 items-center justify-center rounded-full"
        onPress={() => router.push('/(app)/profile')}
        style={{ backgroundColor: colors.primary }}
      >
        <Text className="text-sm font-semibold" style={{ color: colors.primaryForeground }}>
          {initials}
        </Text>
      </Pressable>
    </View>
  );
}
