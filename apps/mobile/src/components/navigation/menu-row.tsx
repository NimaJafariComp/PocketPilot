import { Pressable, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useAppTheme } from '@/providers/theme-provider';
import type { ReactNode } from 'react';
import { fontFamilies } from '@/theme/tokens';

interface MenuRowProps {
  title: string;
  description: string;
  icon: ReactNode;
  onPress: () => void;
}

export function MenuRow({ title, description, icon, onPress }: MenuRowProps) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      className="flex-row items-center gap-4 rounded-[22px] border px-4 py-4"
      onPress={onPress}
      style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
      }}
    >
      <View
        className="h-11 w-11 items-center justify-center rounded-full"
        style={{ backgroundColor: colors.secondary }}
      >
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-sm" style={{ color: colors.foreground, fontFamily: fontFamilies.sans.semibold }}>
          {title}
        </Text>
        <Text
          className="mt-1 text-sm leading-5"
          style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
        >
          {description}
        </Text>
      </View>
      <ChevronRight size={18} color={colors.mutedForeground} strokeWidth={2.2} />
    </Pressable>
  );
}
