import { Pressable, Text } from 'react-native';
import { useAppTheme } from '@/providers/theme-provider';

interface FilterChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

export function FilterChip({ label, active, onPress }: FilterChipProps) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      className="rounded-full px-3 py-2"
      style={{ backgroundColor: active ? colors.primary : colors.secondary }}
      onPress={onPress}
    >
      <Text
        className="text-xs font-semibold"
        style={{ color: active ? colors.primaryForeground : colors.secondaryForeground }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
