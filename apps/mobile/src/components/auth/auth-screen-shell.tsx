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
                  backgroundColor: colors.hero,
                }}
              />
              <View
                className="absolute -right-16 -top-18 h-52 w-52 rounded-full"
                style={{
                  backgroundColor: resolvedTheme === 'dark' ? 'rgba(121, 208, 194, 0.18)' : 'rgba(36, 95, 113, 0.12)',
                }}
              />
              <View
                className="absolute left-[18%] top-[18%] h-44 w-44 rounded-full"
                style={{
                  backgroundColor: resolvedTheme === 'dark' ? 'rgba(110, 167, 200, 0.12)' : 'rgba(255, 249, 241, 0.22)',
                }}
              />
              <View
                className="absolute -left-12 bottom-8 h-36 w-36 rounded-full"
                style={{
                  backgroundColor: resolvedTheme === 'dark' ? 'rgba(216, 162, 103, 0.1)' : 'rgba(187, 124, 69, 0.12)',
                }}
              />
              <View
                className="absolute -left-[10%] top-[16%] h-24 w-[88%] rounded-full"
                style={{
                  backgroundColor: resolvedTheme === 'dark' ? 'rgba(146, 223, 211, 0.08)' : 'rgba(255, 255, 255, 0.18)',
                  transform: [{ rotate: '-14deg' }],
                }}
              />
              <View
                className="absolute right-[-20%] top-[54%] h-20 w-[76%] rounded-full"
                style={{
                  backgroundColor: resolvedTheme === 'dark' ? 'rgba(216, 162, 103, 0.08)' : 'rgba(83, 147, 132, 0.1)',
                  transform: [{ rotate: '16deg' }],
                }}
              />
              <View
                className="absolute left-[8%] top-[42%] h-14 w-[52%] rounded-full"
                style={{
                  backgroundColor: resolvedTheme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.16)',
                  transform: [{ rotate: '-10deg' }],
                }}
              />
              <View
                className="absolute inset-x-0 bottom-0 h-24"
                style={{
                  backgroundColor: resolvedTheme === 'dark' ? 'rgba(6, 13, 20, 0.22)' : 'rgba(255, 250, 243, 0.24)',
                }}
              />
              <View
                className="absolute inset-x-0 bottom-0 h-32"
                style={{
                  backgroundColor: resolvedTheme === 'dark' ? 'rgba(6, 13, 20, 0.2)' : 'rgba(107, 82, 54, 0.04)',
                }}
              />
              <View className="absolute left-[14%] top-[16%] h-1.5 w-1.5 rounded-full" style={{ backgroundColor: resolvedTheme === 'dark' ? 'rgba(232, 245, 241, 0.03)' : 'rgba(107, 82, 54, 0.04)' }} />
              <View className="absolute right-[20%] top-[34%] h-1 w-1 rounded-full" style={{ backgroundColor: resolvedTheme === 'dark' ? 'rgba(232, 245, 241, 0.03)' : 'rgba(107, 82, 54, 0.04)' }} />
              <View className="absolute left-[24%] top-[74%] h-1 w-1 rounded-full" style={{ backgroundColor: resolvedTheme === 'dark' ? 'rgba(232, 245, 241, 0.025)' : 'rgba(107, 82, 54, 0.035)' }} />

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
                backgroundColor: colors.glass,
                borderColor: colors.border,
                shadowColor: resolvedTheme === 'dark' ? 'rgba(3, 8, 14, 0.55)' : 'rgba(88, 67, 44, 0.08)',
                shadowOpacity: 1,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 10 },
                elevation: 2,
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
