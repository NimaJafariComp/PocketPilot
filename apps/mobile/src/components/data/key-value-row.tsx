import { Text, View } from 'react-native';
import { useAppTheme } from '@/providers/theme-provider';

interface KeyValueRowProps {
  label: string;
  value: string;
  emphasizeLabel?: boolean;
}

export function KeyValueRow({ label, value, emphasizeLabel = true }: KeyValueRowProps) {
  const { colors } = useAppTheme();

  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text
        className={emphasizeLabel ? 'text-sm font-semibold' : 'text-sm'}
        style={{ color: emphasizeLabel ? colors.foreground : colors.mutedForeground }}
      >
        {label}
      </Text>
      <Text className="text-sm" style={{ color: colors.mutedForeground }}>
        {value}
      </Text>
    </View>
  );
}
