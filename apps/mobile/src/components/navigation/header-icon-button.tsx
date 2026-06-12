import { Platform, Pressable, View } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Plus } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useAppTheme } from '@/providers/theme-provider';

interface HeaderIconButtonProps {
  label: string;
  /** SF Symbol shown on iOS — matches the system glass nav-bar buttons. */
  symbol: SymbolViewProps['name'];
  /** Cross-platform fallback icon (Android, or if the symbol is missing). */
  fallback: ReactNode;
  onPress: () => void;
}

export function HeaderIconButton({ label, symbol, fallback, onPress }: HeaderIconButtonProps) {
  const { colors } = useAppTheme();
  const shouldUseFallback = Platform.OS !== 'ios' || symbol === 'plus';
  const renderedIcon =
    symbol === 'plus' ? <Plus size={20} color={colors.tint} strokeWidth={2.2} /> : fallback;

  // UIKit stretches custom bar-button views to a minimum 36x36 anchored at
  // (0,0) on iOS 26 (react-native-screens #2990), so the view must be exactly
  // 36x36 with the glyph centered for it to sit centered in the glass circle.
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      className="h-9 w-9 items-center justify-center"
      hitSlop={8}
      onPress={onPress}
    >
      {/* The glass circle runs a hair wider than the 36pt minimum frame UIKit
          left-anchors us in, so the glyph needs a ~1pt optical correction. */}
      <View style={{ transform: [{ translateX: 2 }] }}>
      {shouldUseFallback ? (
        renderedIcon
      ) : (
        <SymbolView
          name={symbol}
          tintColor={colors.tint}
          weight="medium"
          size={20}
          resizeMode="scaleAspectFit"
          fallback={fallback}
        />
      )}
      </View>
    </Pressable>
  );
}
