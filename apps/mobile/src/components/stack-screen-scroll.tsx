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
  const resolvedBottomInset = bottomInset ?? Math.max(160, insets.bottom + 32);

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingTop: 8, paddingBottom: resolvedBottomInset }}
    >
      <View className="gap-4">
        {header}
        {children}
      </View>
    </ScrollView>
  );
}
