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
  bottomInset = 19,
}: StackScreenScrollProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: bottomInset }}
    >
      <View className="gap-4">
        {header}
        {children}
      </View>
    </ScrollView>
  );
}
