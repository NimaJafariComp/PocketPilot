import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PropsWithChildren, ReactNode } from 'react';

interface StackScreenScrollProps extends PropsWithChildren {
  header?: ReactNode;
  bottomInset?: number;
}

export function StackScreenScroll({
  children,
  header,
  bottomInset,
}: StackScreenScrollProps) {
  const insets = useSafeAreaInsets();
  const resolvedBottomInset = bottomInset ?? Math.max(32, insets.bottom + 16);

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingTop: 16, paddingBottom: resolvedBottomInset }}
    >
      <View className="gap-5">
        {header}
        {children}
      </View>
    </ScrollView>
  );
}
