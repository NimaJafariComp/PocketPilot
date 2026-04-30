import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWindowDimensions, View, type ViewProps } from 'react-native';
import { useAppTheme } from '@/providers/theme-provider';
import type { PropsWithChildren } from 'react';
import { PageBackdrop } from '@/components/visual/page-backdrop';

const UI_SCALE = 0.9;
const UI_SCALE_INVERSE = 1 / UI_SCALE;

interface ScreenProps extends PropsWithChildren<ViewProps> {
  padded?: boolean;
  atmospheric?: boolean;
  atmosphericIntensity?: 'soft' | 'medium';
  safeEdges?: Array<'top' | 'right' | 'bottom' | 'left'>;
}

export function Screen({
  children,
  padded = true,
  atmospheric = false,
  atmosphericIntensity = 'soft',
  safeEdges = ['top', 'left', 'right'],
  style,
  ...props
}: ScreenProps) {
  const { colors } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { bottom: insetBottom } = insets;
  const sidePadding = padded ? 20 : 0; // matches px-5 (20) on each side
  const contentWidth = width - sidePadding * 2;
  const offsetX = (contentWidth * (UI_SCALE_INVERSE - 1)) / 2;
  const offsetY = (height * (UI_SCALE_INVERSE - 1)) / 2;
  const innerLeft = sidePadding;
  const bottomPadding = Math.max(160, insetBottom + 32);

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: colors.background }}
    >
      {atmospheric ? <PageBackdrop intensity={atmosphericIntensity} /> : null}
      <SafeAreaView
        className="flex-1"
        edges={safeEdges}
        style={{ backgroundColor: 'transparent' }}
      >
      <View
        className={padded ? 'flex-1 px-5 pb-0 pt-2' : 'flex-1'}
        style={[{ position: 'relative', overflow: 'hidden', width, paddingBottom: bottomPadding }, style]}
        {...props}
      >
        <View
          style={{
            width: contentWidth * UI_SCALE_INVERSE,
            height: height * UI_SCALE_INVERSE,
            position: 'absolute',
            top: -offsetY,
            left: innerLeft - offsetX,
            transform: [{ scale: UI_SCALE }],
          }}
        >
          {children}
        </View>
      </View>
      </SafeAreaView>
    </View>
  );
}
