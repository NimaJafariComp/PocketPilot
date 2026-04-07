import { View } from 'react-native';
import { useAppTheme } from '@/providers/theme-provider';

interface PageBackdropProps {
  intensity?: 'soft' | 'medium';
}

export function PageBackdrop({ intensity = 'soft' }: PageBackdropProps) {
  const { resolvedTheme } = useAppTheme();
  const isDark = resolvedTheme === 'dark';
  const topRight = intensity === 'medium'
    ? isDark
      ? 'rgba(122, 182, 255, 0.16)'
      : 'rgba(43, 103, 246, 0.12)'
    : isDark
      ? 'rgba(122, 182, 255, 0.12)'
      : 'rgba(43, 103, 246, 0.08)';
  const lowerLeft = intensity === 'medium'
    ? isDark
      ? 'rgba(246, 199, 104, 0.13)'
      : 'rgba(213, 155, 47, 0.1)'
    : isDark
      ? 'rgba(51, 209, 161, 0.12)'
      : 'rgba(31, 157, 114, 0.08)';

  return (
    <View className="absolute inset-0 overflow-hidden" pointerEvents="none">
      <View
        className="absolute -right-20 -top-14 h-52 w-52 rounded-full"
        style={{ backgroundColor: topRight }}
      />
      <View
        className="absolute -left-16 top-32 h-40 w-40 rounded-full"
        style={{ backgroundColor: lowerLeft }}
      />
      <View
        className="absolute right-4 top-40 h-24 w-24 rounded-full"
        style={{
          backgroundColor: isDark ? 'rgba(238, 244, 255, 0.04)' : 'rgba(255, 255, 255, 0.4)',
        }}
      />
    </View>
  );
}
