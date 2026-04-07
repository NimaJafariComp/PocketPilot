import { View } from 'react-native';
import { Children, type PropsWithChildren, type ReactNode } from 'react';

export function MetricGrid({ children }: PropsWithChildren) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {Children.toArray(children).map((child: ReactNode, index: number) => (
        <View key={index} style={{ minWidth: 152, flexGrow: 1, flexBasis: 0 }}>
          {child}
        </View>
      ))}
    </View>
  );
}
