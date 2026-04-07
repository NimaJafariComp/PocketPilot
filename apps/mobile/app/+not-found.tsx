import { Link } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { Screen } from '@/components/screen';
import { useAppTheme } from '@/providers/theme-provider';

export default function NotFoundScreen() {
  const { colors } = useAppTheme();

  return (
    <Screen>
      <Text className="text-3xl font-semibold" style={{ color: colors.foreground }}>
        Screen not found
      </Text>
      <Text className="mt-3 text-base leading-6" style={{ color: colors.mutedForeground }}>
        The mobile route exists in the shell, but this destination has not been implemented yet.
      </Text>
      <Link href="/(auth)/signin" asChild>
        <Pressable
          className="mt-8 self-start rounded-2xl px-5 py-3"
          style={{ backgroundColor: colors.primary }}
        >
          <Text className="text-sm font-semibold" style={{ color: colors.primaryForeground }}>
            Back to sign in
          </Text>
        </Pressable>
      </Link>
    </Screen>
  );
}
