import { Pressable, Text, View } from 'react-native';
import { Screen } from '@/components/screen';
import { useAppTheme } from '@/providers/theme-provider';

interface PlaceholderScreenProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function PlaceholderScreen({ eyebrow, title, description }: PlaceholderScreenProps) {
  const { colors, resolvedTheme, themePreference, setThemePreference } = useAppTheme();

  return (
    <Screen>
      <View
        className="flex-1 rounded-2xl border px-6 py-6"
        style={{
          backgroundColor: colors.card,
          borderColor: colors.border,
        }}
      >
        <View
          className="mb-6 self-start rounded-full px-3 py-1.5"
          style={{ backgroundColor: colors.secondary }}
        >
          <Text className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: colors.secondaryForeground }}>
            {eyebrow}
          </Text>
        </View>

        <View className="gap-3">
          <Text className="text-4xl font-semibold tracking-tight" style={{ color: colors.foreground }}>
            {title}
          </Text>
          <Text className="text-base leading-6" style={{ color: colors.mutedForeground }}>
            {description}
          </Text>
        </View>

        <View
          className="mt-8 rounded-xl px-5 py-5"
          style={{
            backgroundColor: resolvedTheme === 'dark' ? '#102035' : '#EDF2FB',
          }}
        >
          <Text className="text-sm font-semibold uppercase tracking-[2px]" style={{ color: colors.mutedForeground }}>
            Phase 1 Foundation
          </Text>
          <Text className="mt-3 text-sm leading-6" style={{ color: colors.foreground }}>
            Expo Router, NativeWind, safe area handling, theme persistence, and the mobile route tree are in place.
          </Text>
        </View>

        <View className="mt-auto gap-3">
          <Text className="text-sm" style={{ color: colors.mutedForeground }}>
            Theme preference: {themePreference}
          </Text>
          <View className="flex-row gap-3">
            {(['light', 'dark', 'system'] as const).map((option) => {
              const isActive = option === themePreference;
              return (
                <Pressable
                  key={option}
                  className="flex-1 rounded-2xl px-4 py-3"
                  style={{
                    backgroundColor: isActive ? colors.primary : colors.muted,
                  }}
                  onPress={() => setThemePreference(option)}
                >
                  <Text
                    className="text-center text-sm font-semibold capitalize"
                    style={{ color: isActive ? colors.primaryForeground : colors.foreground }}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Screen>
  );
}
