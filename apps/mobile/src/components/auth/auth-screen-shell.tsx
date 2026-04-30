import { Image, KeyboardAvoidingView, Platform, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Link } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Screen } from '@/components/screen';
import { useAppTheme } from '@/providers/theme-provider';
import { fontFamilies } from '@/theme/tokens';
import type { PropsWithChildren, ReactNode } from 'react';

interface AuthScreenShellProps extends PropsWithChildren {
  eyebrow?: string;
  title: string;
  description?: string;
  footerPrompt: string;
  footerLinkLabel: string;
  footerLinkHref: '/(auth)/signin' | '/(auth)/signup';
  highlights?: string[];
  headerAction?: ReactNode;
  panelStyle?: StyleProp<ViewStyle>;
  brandFontFamily?: string;
  titleFontFamily?: string;
  eyebrowFontFamily?: string;
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
  panelStyle,
  brandFontFamily = fontFamilies.sans.semibold,
  titleFontFamily = fontFamilies.sans.semibold,
  eyebrowFontFamily = fontFamilies.sans.semibold,
}: AuthScreenShellProps) {
  const { colors } = useAppTheme();
  const player = useVideoPlayer(require('../../../assets/login-bg.mp4'), (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.play();
  });

  return (
    <Screen padded={false} safeEdges={['left', 'right']}>
      <View className="absolute inset-0">
        <VideoView
          player={player}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          nativeControls={false}
          allowsFullscreen={false}
          allowsPictureInPicture={false}
          pointerEvents="none"
        />
        <View style={StyleSheet.absoluteFillObject} className="bg-black/60" />
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <View className="flex-1 justify-center px-5 pb-10 pt-12">
          <View className="items-center pb-8">
            <Image
              source={require('../../../assets/icon.png')}
              className="h-16 w-16"
              resizeMode="contain"
            />
            <Text
              className="mt-4 text-lg font-semibold tracking-[0.8px]"
              style={{ color: colors.foreground, fontFamily: brandFontFamily }}
            >
              PocketPilot
            </Text>
            {eyebrow ? (
              <Text
                className="mt-2 text-[11px] font-semibold uppercase tracking-[2px]"
                style={{ color: colors.primary, fontFamily: eyebrowFontFamily }}
              >
                {eyebrow}
              </Text>
            ) : null}
            <Text
              className="mt-4 text-center text-[28px] font-semibold leading-[36px]"
              style={{ color: colors.foreground, fontFamily: titleFontFamily }}
            >
              {title}
            </Text>
            {description ? (
              <Text className="mt-3 text-center text-sm leading-6" style={{ color: colors.mutedForeground }}>
                {description}
              </Text>
            ) : null}
            {highlights.length > 0 ? (
              <View className="mt-5 gap-2">
                {highlights.map((highlight) => (
                  <Text key={highlight} className="text-center text-sm" style={{ color: colors.mutedForeground }}>
                    {highlight}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>

          <View
            className="rounded-[32px] border px-5 pb-6 pt-6"
            style={[
              {
                backgroundColor: colors.glass,
                borderColor: colors.border,
                shadowColor: 'rgba(3, 8, 14, 0.55)',
                shadowOpacity: 1,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 10 },
                elevation: 2,
              },
              panelStyle,
            ]}
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
      </KeyboardAvoidingView>
    </Screen>
  );
}
