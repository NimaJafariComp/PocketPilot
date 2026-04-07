import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Screen } from '@/components/screen';
import type { PropsWithChildren, ReactNode } from 'react';

interface FormScreenProps extends PropsWithChildren {
  header: ReactNode;
  footer?: ReactNode;
}

export function FormScreen({ header, footer, children }: FormScreenProps) {
  return (
    <Screen atmospheric padded={false}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        keyboardVerticalOffset={18}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28, gap: 18 }}
          showsVerticalScrollIndicator={false}
        >
          {header}
          <View className="gap-4">{children}</View>
        </ScrollView>
        {footer ? <View className="px-5 pb-6 pt-3">{footer}</View> : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}
