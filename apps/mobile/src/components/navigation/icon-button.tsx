import { Pressable, View } from 'react-native';
import { useAppTheme } from '@/providers/theme-provider';
import type { ReactNode } from 'react';

interface IconButtonProps {
  label: string;
  onPress: () => void;
  icon: ReactNode;
}

export function IconButton({ label, onPress, icon }: IconButtonProps) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      className="h-11 w-11 items-center justify-center rounded-full border"
      onPress={onPress}
      style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
      }}
    >
      <View>{icon}</View>
    </Pressable>
  );
}
