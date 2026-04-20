import { View } from 'react-native';
import { useAppTheme } from '@/providers/theme-provider';

interface PageBackdropProps {
  intensity?: 'soft' | 'medium';
}

export function PageBackdrop({ intensity = 'soft' }: PageBackdropProps) {
  const { resolvedTheme } = useAppTheme();
  const isDark = resolvedTheme === 'dark';
  const topLight = intensity === 'medium'
    ? isDark
      ? 'rgba(121, 208, 194, 0.18)'
      : 'rgba(36, 95, 113, 0.11)'
    : isDark
      ? 'rgba(121, 208, 194, 0.12)'
      : 'rgba(36, 95, 113, 0.08)';
  const accentLight = intensity === 'medium'
    ? isDark
      ? 'rgba(216, 162, 103, 0.14)'
      : 'rgba(187, 124, 69, 0.1)'
    : isDark
      ? 'rgba(110, 167, 200, 0.12)'
      : 'rgba(109, 106, 168, 0.08)';
  const veil = isDark ? 'rgba(5, 14, 21, 0.2)' : 'rgba(255, 250, 244, 0.34)';
  const ribbon = isDark ? 'rgba(131, 219, 205, 0.08)' : 'rgba(255, 255, 255, 0.2)';
  const fleck = isDark ? 'rgba(225, 244, 241, 0.03)' : 'rgba(96, 75, 52, 0.04)';
  const vignette = isDark ? 'rgba(3, 10, 16, 0.26)' : 'rgba(185, 168, 145, 0.12)';

  return (
    <View className="absolute inset-0 overflow-hidden" pointerEvents="none">
      <View
        className="absolute inset-0"
        style={{ backgroundColor: veil }}
      />
      <View
        className="absolute -right-16 -top-12 h-56 w-56 rounded-full"
        style={{ backgroundColor: topLight }}
      />
      <View
        className="absolute -left-20 top-28 h-48 w-48 rounded-full"
        style={{ backgroundColor: accentLight }}
      />
      <View
        className="absolute left-[-24%] top-[18%] h-28 w-[92%] rounded-full"
        style={{
          backgroundColor: ribbon,
          transform: [{ rotate: '-18deg' }],
        }}
      />
      <View
        className="absolute right-[-30%] top-[48%] h-24 w-[88%] rounded-full"
        style={{
          backgroundColor: ribbon,
          transform: [{ rotate: '12deg' }],
        }}
      />
      <View
        className="absolute left-[12%] top-[14%] h-1.5 w-1.5 rounded-full"
        style={{
          backgroundColor: fleck,
        }}
      />
      <View className="absolute right-[18%] top-[32%] h-1 w-1 rounded-full" style={{ backgroundColor: fleck }} />
      <View className="absolute left-[24%] top-[70%] h-1 w-1 rounded-full" style={{ backgroundColor: fleck }} />
      <View className="absolute right-[28%] top-[78%] h-1.5 w-1.5 rounded-full" style={{ backgroundColor: fleck }} />
      <View
        className="absolute inset-0"
        style={{
          borderRadius: 999,
          shadowColor: vignette,
          shadowOpacity: 1,
          shadowRadius: 48,
          shadowOffset: { width: 0, height: 0 },
        }}
      />
    </View>
  );
}
