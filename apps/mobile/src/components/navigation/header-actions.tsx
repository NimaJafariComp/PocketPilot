import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MoonStar, SunMedium } from 'lucide-react-native';
import { useAuth } from '@pocketpilot/services/src/react';
import { useAppTheme } from '@/providers/theme-provider';
import { hapticSelect } from '@/lib/haptics';
import { Platform } from 'react-native';
import { SymbolView } from 'expo-symbols';

// Bare icon buttons sized for a native UINavigationBar right slot.
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
    <View className="h-9 flex-row items-center gap-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Switch to ${showingDark ? 'light' : 'dark'} theme`}
        className="h-9 w-9 items-center justify-center"
        hitSlop={8}
        onPress={() => {
          hapticSelect();
          setThemePreference(showingDark ? 'light' : 'dark');
        }}
      >
        <View style={{ transform: [{ translateX: 2 }] }}>
        {Platform.OS === 'ios' ? (
          <SymbolView
            name={showingDark ? 'sun.max' : 'moon.stars'}
            tintColor={colors.tint}
            weight="medium"
            size={20}
            resizeMode="scaleAspectFit"
            fallback={
              showingDark ? (
                <SunMedium size={22} color={colors.tint} strokeWidth={2} />
              ) : (
                <MoonStar size={22} color={colors.tint} strokeWidth={2} />
              )
            }
          />
        ) : showingDark ? (
          <SunMedium size={22} color={colors.tint} strokeWidth={2} />
        ) : (
          <MoonStar size={22} color={colors.tint} strokeWidth={2} />
        )}
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open profile"
        hitSlop={6}
        className="h-8 w-8 items-center justify-center rounded-full"
        onPress={() => router.push('/(app)/profile')}
        style={{ backgroundColor: colors.primary }}
      >
        <Text className="text-xs font-semibold" style={{ color: colors.primaryForeground }}>
          {initials}
        </Text>
      </Pressable>
    </View>
  );
}
