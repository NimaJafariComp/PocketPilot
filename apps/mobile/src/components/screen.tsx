import { SafeAreaView } from 'react-native-safe-area-context';
import { View, type ViewProps } from 'react-native';
import { useAppTheme } from '@/providers/theme-provider';
import type { PropsWithChildren } from 'react';

interface ScreenProps extends PropsWithChildren<ViewProps> {
  padded?: boolean;
  /** @deprecated decorative backdrops removed in the native redesign */
  atmospheric?: boolean;
  /** @deprecated decorative backdrops removed in the native redesign */
  atmosphericIntensity?: 'soft' | 'medium';
  safeEdges?: Array<'top' | 'right' | 'bottom' | 'left'>;
}

export function Screen({
  children,
  padded = true,
  atmospheric: _atmospheric,
  atmosphericIntensity: _atmosphericIntensity,
  safeEdges = ['left', 'right'],
  style,
  ...props
}: ScreenProps) {
  const { colors } = useAppTheme();

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <SafeAreaView className="flex-1" edges={safeEdges} style={{ backgroundColor: 'transparent' }}>
        <View className={padded ? 'flex-1 px-4' : 'flex-1'} style={style} {...props}>
          {children}
        </View>
      </SafeAreaView>
    </View>
  );
}
