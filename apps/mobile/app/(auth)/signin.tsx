import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@pocketpilot/services/src/react';
import { AuthErrorBanner } from '@/components/auth/auth-error-banner';
import { AuthField } from '@/components/auth/auth-field';
import { AuthScreenShell } from '@/components/auth/auth-screen-shell';
import { useAppTheme } from '@/providers/theme-provider';

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
      eyebrow="Welcome Back"
      title="Sign in and pick up where your money left off."
      description="Track spending, review smart categories, and get back to your financial dashboard with a calm native flow."
      footerPrompt="Need an account?"
      footerLinkLabel="Create one"
      footerLinkHref="/(auth)/signup"
      highlights={[
        'Import and organize transactions without leaving your phone.',
        'Review budgets, goals, and AI insights in one secure place.',
        'Stay synced with your shared PocketPilot data and services.',
      ]}
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

      <Text className="mt-4 text-center text-xs leading-5" style={{ color: colors.mutedForeground }}>
        Your auth state is handled by the shared PocketPilot services layer.
      </Text>
    </AuthScreenShell>
  );
}
