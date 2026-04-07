import { Text, View } from 'react-native';
import { useAppTheme } from '@/providers/theme-provider';

export function AuthErrorBanner({ message }: { message: string }) {
  const { colors, resolvedTheme } = useAppTheme();

  return (
    <View
      className="mb-5 rounded-[20px] border px-4 py-3"
      style={{
        borderColor: colors.danger,
        backgroundColor: resolvedTheme === 'dark' ? 'rgba(255, 122, 136, 0.14)' : 'rgba(220, 73, 96, 0.10)',
      }}
    >
      <Text className="text-sm leading-6" style={{ color: colors.danger }}>
        {message}
      </Text>
    </View>
  );
}
