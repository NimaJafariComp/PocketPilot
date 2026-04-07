import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Screen } from '@/components/screen';
import { useAppTheme } from '@/providers/theme-provider';
import type { PropsWithChildren, ReactNode } from 'react';

interface AuthScreenShellProps extends PropsWithChildren {
  eyebrow: string;
  title: string;
  description: string;
  footerPrompt: string;
  footerLinkLabel: string;
  footerLinkHref: '/(auth)/signin' | '/(auth)/signup';
  highlights?: string[];
  headerAction?: ReactNode;
}

export function AuthScreenShell({
  children,
  eyebrow,
  title,
  description,
  footerPrompt,
  footerLinkLabel,
  footerLinkHref,
  highlights = [],
  headerAction,
}: AuthScreenShellProps) {
  const { colors, resolvedTheme } = useAppTheme();

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-5 pb-8 pt-4">
            <View className="relative overflow-hidden rounded-[36px]">
              <View
                className="absolute inset-0"
                style={{
                  backgroundColor: resolvedTheme === 'dark' ? '#09172B' : '#EAF2FF',
                }}
              />
              <View
                className="absolute -right-14 -top-14 h-40 w-40 rounded-full"
                style={{
                  backgroundColor: resolvedTheme === 'dark' ? 'rgba(122, 182, 255, 0.18)' : 'rgba(43, 103, 246, 0.16)',
                }}
              />
              <View
                className="absolute -left-10 bottom-12 h-28 w-28 rounded-full"
                style={{
                  backgroundColor: resolvedTheme === 'dark' ? 'rgba(51, 209, 161, 0.12)' : 'rgba(24, 49, 83, 0.08)',
                }}
              />

              <View className="px-6 pb-7 pt-6">
                <View className="mb-10 flex-row items-start justify-between">
                  <View>
                    <View
                      className="self-start rounded-full px-3 py-1.5"
                      style={{ backgroundColor: colors.card }}
                    >
                      <Text className="text-[11px] font-semibold uppercase tracking-[2px]" style={{ color: colors.primary }}>
                        {eyebrow}
                      </Text>
                    </View>
                    <Text className="mt-4 text-[28px] font-semibold tracking-tight" style={{ color: colors.foreground }}>
                      PocketPilot
                    </Text>
                  </View>
                  {headerAction}
                </View>

                <Text className="text-[34px] font-semibold leading-[40px] tracking-tight" style={{ color: colors.foreground }}>
                  {title}
                </Text>
                <Text className="mt-3 max-w-[280px] text-sm leading-6" style={{ color: colors.mutedForeground }}>
                  {description}
                </Text>

                {highlights.length > 0 ? (
                  <View className="mt-7 gap-3">
                    {highlights.map((highlight) => (
                      <View key={highlight} className="flex-row items-center gap-3">
                        <View
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: colors.primary }}
                        />
                        <Text className="flex-1 text-sm leading-6" style={{ color: colors.foreground }}>
                          {highlight}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>

            <View
              className="mt-5 rounded-[32px] border px-5 pb-6 pt-6"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.border,
              }}
            >
              {children}

              <View className="mt-6 flex-row items-center justify-center gap-1">
                <Text className="text-sm" style={{ color: colors.mutedForeground }}>
                  {footerPrompt}
                </Text>
                <Link href={footerLinkHref} asChild>
                  <Pressable hitSlop={10}>
                    <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
                      {footerLinkLabel}
                    </Text>
                  </Pressable>
                </Link>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
