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
    <SafeAreaView
      className="flex-1"
      edges={['left', 'right']}
      style={{ backgroundColor: colors.background }}
    >
      <View
        className={padded ? 'flex-1 px-5 pb-0 pt-2' : 'flex-1'}
        style={[{ position: 'relative' }, style]}
        {...props}
      >
        {atmospheric ? <PageBackdrop intensity={atmosphericIntensity} /> : null}
        {children}
      </View>
    </SafeAreaView>
  );
}
