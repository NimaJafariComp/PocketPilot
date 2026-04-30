import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@pocketpilot/services/src/react';
import { AuthErrorBanner } from '@/components/auth/auth-error-banner';
import { AuthField } from '@/components/auth/auth-field';
import { AuthScreenShell } from '@/components/auth/auth-screen-shell';
import { useAppTheme } from '@/providers/theme-provider';
import { fontFamilies } from '@/theme/tokens';

export default function SignInScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailError = useMemo(() => {
    if (!email) {
      return '';
    }
    return /\S+@\S+\.\S+/.test(email) ? '' : 'Enter a valid email address.';
  }, [email]);

  const passwordError = useMemo(() => {
    if (!password) {
      return '';
    }
    return password.length >= 6 ? '' : 'Password must be at least 6 characters.';
  }, [password]);

  const isDisabled = isSubmitting || !email || !password || !!emailError || !!passwordError;

  async function handleSubmit() {
    if (isDisabled) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await signIn(email.trim(), password);
      router.replace('/(app)/(tabs)/dashboard');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Sign in failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScreenShell
      title="Own your financial control. Own your data."
      footerPrompt="Need an account?"
      footerLinkLabel="Create one"
      footerLinkHref="/(auth)/signup"
      brandFontFamily={fontFamilies.serif.semibold}
      titleFontFamily={fontFamilies.serif.semibold}
      panelStyle={{
        backgroundColor: 'rgba(255, 255, 255, 0.14)',
        borderColor: 'rgba(203, 233, 255, 0.38)',
        shadowColor: 'rgba(120, 200, 230, 0.35)',
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 },
      }}
    >
      {error ? <AuthErrorBanner message={error} /> : null}

      <View className="gap-4">
        <AuthField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          placeholder="you@example.com"
          returnKeyType="next"
          error={emailError}
        />
        <AuthField
          label="Password"
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
          autoComplete="password"
          secureTextEntry
          placeholder="Enter your password"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          error={passwordError}
        />
      </View>

      <Pressable
        className="mt-6 rounded-[22px] px-5 py-4"
        style={{
          backgroundColor: isDisabled ? colors.secondary : colors.primary,
          opacity: isSubmitting ? 0.8 : 1,
        }}
        disabled={isDisabled}
        onPress={handleSubmit}
      >
        <Text
          className="text-center text-base font-semibold"
          style={{ color: isDisabled ? colors.secondaryForeground : colors.primaryForeground }}
        >
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </Text>
      </Pressable>

    </AuthScreenShell>
  );
}
