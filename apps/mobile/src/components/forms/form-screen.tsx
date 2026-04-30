import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PropsWithChildren, ReactNode } from 'react';
import { useAppTheme } from '@/providers/theme-provider';
import { PageBackdrop } from '@/components/visual/page-backdrop';

interface FormScreenProps extends PropsWithChildren {
  header: ReactNode;
  footer?: ReactNode;
}

export function FormScreen({ header, footer, children }: FormScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const footerBottomPadding = Math.max(16, insets.bottom + 8);
  const scrollBottomPadding = footer ? Math.max(160, insets.bottom + 112) : Math.max(28, insets.bottom + 20);

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <PageBackdrop intensity="soft" />
      <SafeAreaView className="flex-1" edges={['top', 'right', 'bottom', 'left']} style={{ backgroundColor: 'transparent' }}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        keyboardVerticalOffset={18}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: scrollBottomPadding,
            gap: 18,
          }}
          showsVerticalScrollIndicator={false}
        >
          {header}
          <View className="gap-4">{children}</View>
        </ScrollView>
        {footer ? (
          <View
            className="px-5 pt-3"
            style={{
              paddingBottom: footerBottomPadding,
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              borderTopWidth: 1,
            }}
          >
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
