import { ScrollView, View } from 'react-native';
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
  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingTop: 8, paddingBottom: bottomInset }}
    >
      <View className="gap-4">
        {header}
        {children}
      </View>
    </ScrollView>
  );
}
