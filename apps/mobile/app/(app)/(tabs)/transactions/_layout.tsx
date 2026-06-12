import { Stack } from 'expo-router';
import { useAppTheme } from '@/providers/theme-provider';
import { largeTitleScreenOptions } from '@/lib/navigation';

export default function TransactionsStackLayout() {
  const { colors } = useAppTheme();

  return (
    <Stack screenOptions={largeTitleScreenOptions(colors)}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Transactions',
        }}
      />
    </Stack>
  );
}
