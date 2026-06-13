import type { PropsWithChildren, ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/providers/theme-provider";

interface FormScreenProps extends PropsWithChildren {
  header?: ReactNode;
  footer?: ReactNode;
}

export function FormScreen({ header, footer, children }: FormScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const footerBottomPadding = Math.max(16, insets.bottom + 8);
  const scrollBottomPadding = footer
    ? Math.max(120, insets.bottom + 96)
    : Math.max(28, insets.bottom + 20);

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.select({ ios: "padding", android: undefined })}
        keyboardVerticalOffset={18}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: scrollBottomPadding,
            gap: 16,
          }}
          showsVerticalScrollIndicator={false}
        >
          {header}
          <View className="gap-4">{children}</View>
        </ScrollView>
        {footer ? (
          <View
            className="px-4 pt-3"
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
    </View>
  );
}
