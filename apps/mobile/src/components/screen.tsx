import { SafeAreaView } from 'react-native-safe-area-context';
import { View, type ViewProps } from 'react-native';
import { useAppTheme } from '@/providers/theme-provider';
import type { PropsWithChildren } from 'react';
import { PageBackdrop } from '@/components/visual/page-backdrop';

interface ScreenProps extends PropsWithChildren<ViewProps> {
  padded?: boolean;
  atmospheric?: boolean;
  atmosphericIntensity?: 'soft' | 'medium';
}

export function Screen({
  children,
  padded = true,
  atmospheric = false,
  atmosphericIntensity = 'soft',
  style,
  ...props
}: ScreenProps) {
  const { colors } = useAppTheme();

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: colors.background }}
    >
      {atmospheric ? <PageBackdrop intensity={atmosphericIntensity} /> : null}
      <SafeAreaView
        className="flex-1"
        edges={['top', 'left', 'right']}
        style={{ backgroundColor: 'transparent' }}
      >
      <View
        className={padded ? 'flex-1 px-5 pb-0 pt-2' : 'flex-1'}
        style={[{ position: 'relative' }, style]}
        {...props}
      >
        {children}
      </View>
      </SafeAreaView>
    </View>
  );
}
