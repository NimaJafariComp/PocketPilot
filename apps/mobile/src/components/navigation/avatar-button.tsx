import { Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@pocketpilot/services/src/react';
import { useAppTheme } from '@/providers/theme-provider';

export function AvatarButton() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useAppTheme();

  const initials = (user?.displayName || user?.email || 'PP')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
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
  );
}
