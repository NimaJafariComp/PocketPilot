import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@pocketpilot/services/src/react';
import { AuthErrorBanner } from '@/components/auth/auth-error-banner';
import { AuthField } from '@/components/auth/auth-field';
import { AuthScreenShell } from '@/components/auth/auth-screen-shell';
import { useAppTheme } from '@/providers/theme-provider';

export default function SignUpScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameError = useMemo(() => {
    if (!name) {
      return '';
    }
    return name.trim().length >= 2 ? '' : 'Enter your full name.';
  }, [name]);

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
    return password.length >= 6 ? '' : 'Use at least 6 characters.';
  }, [password]);

  const isDisabled =
    isSubmitting || !name.trim() || !email || !password || !!nameError || !!emailError || !!passwordError;

  async function handleSubmit() {
    if (isDisabled) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await signUp(name.trim(), email.trim(), password);
      router.replace('/(app)/(tabs)/dashboard');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Sign up failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScreenShell
      title="Create your PocketPilot account."
      footerPrompt="Already have an account?"
      footerLinkLabel="Sign in"
      footerLinkHref="/(auth)/signin"
    >
      {error ? <AuthErrorBanner message={error} /> : null}

      <View className="gap-4">
        <AuthField
          label="Full name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoCorrect={false}
          textContentType="name"
          autoComplete="name"
          placeholder="Jordan Lee"
          returnKeyType="next"
          error={nameError}
        />
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
          textContentType="newPassword"
          autoComplete="password-new"
          secureTextEntry
          placeholder="Create a password"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          error={passwordError}
        />
      </View>

      <Pressable
        className="mt-6 rounded-xl px-5 py-4"
        style={{
          backgroundColor: isDisabled ? 'rgba(255, 255, 255, 0.12)' : '#0A84FF',
          opacity: isSubmitting ? 0.8 : 1,
        }}
        disabled={isDisabled}
        onPress={handleSubmit}
      >
        <Text
          className="text-center text-base font-semibold"
          style={{ color: isDisabled ? 'rgba(235, 235, 245, 0.45)' : '#FFFFFF' }}
        >
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </Text>
      </Pressable>

    </AuthScreenShell>
  );
}
