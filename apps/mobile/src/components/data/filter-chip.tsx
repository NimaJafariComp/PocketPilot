import { Pressable, Text } from 'react-native';
import { useAppTheme } from '@/providers/theme-provider';
import { fontFamilies } from '@/theme/tokens';
import { hapticSelect } from '@/lib/haptics';

interface FilterChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

// Segmented-style pill: tint-filled when active, quaternary fill otherwise.
export function FilterChip({ label, active, onPress }: FilterChipProps) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      className="rounded-full px-3.5 py-2"
      style={{ backgroundColor: active ? colors.tint : colors.glass }}
      onPress={() => {
        hapticSelect();
        onPress();
      }}
    >
      <Text
        className="text-[13px]"
        style={{
          color: active ? colors.primaryForeground : colors.foreground,
          fontFamily: fontFamilies.sans.medium,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
