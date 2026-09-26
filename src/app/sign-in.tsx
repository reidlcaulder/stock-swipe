import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-provider';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { config } from '@/lib/config';
import { colors, radius, spacing } from '@/theme';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignInScreen() {
  const { sendCode, verifyCode } = useAuth();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const submitEmail = () =>
    run(async () => {
      const trimmed = email.trim().toLowerCase();
      if (!EMAIL_PATTERN.test(trimmed)) throw new Error('Enter a valid email address');
      await sendCode(trimmed);
      setEmail(trimmed);
      setStep('code');
    });

  const submitCode = () =>
    run(async () => {
      if (!/^\d{6}$/.test(code)) throw new Error('Enter the 6-digit code from the email');
      await verifyCode(email, code);
    });

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Icon name="chart" size={30} color={colors.white} />
          </View>
          <Text style={styles.title}>StockSwipe</Text>
          <Text style={styles.subtitle}>
            Swipe right to watch a stock, left to pass. Live prices, no noise.
          </Text>
        </View>

        <View style={styles.form}>
          {step === 'email' ? (
            <>
              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="send"
                onSubmitEditing={submitEmail}
                style={styles.input}
                accessibilityLabel="Email"
              />
              <Button label="Send sign-in code" icon="mail" onPress={submitEmail} loading={busy} />
            </>
          ) : (
            <>
              <Text style={styles.label}>6-digit code sent to {email}</Text>
              <TextInput
                value={code}
                onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                returnKeyType="done"
                onSubmitEditing={submitCode}
                maxLength={6}
                style={[styles.input, styles.codeInput]}
                accessibilityLabel="Sign-in code"
              />
              <Button label="Sign in" onPress={submitCode} loading={busy} />
              <Pressable
                onPress={() => {
                  setStep('email');
                  setCode('');
                  setError(null);
                }}
                style={styles.linkButton}>
                <Text style={styles.link}>Use a different email</Text>
              </Pressable>
            </>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {config.useMocks ? (
            <Text style={styles.demo}>Demo mode: no email is sent. Any 6-digit code works.</Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.xxl,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  brand: { alignItems: 'center' },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '8deg' }],
    marginBottom: spacing.lg,
  },
  title: { color: colors.text, fontSize: 34, fontWeight: '900', letterSpacing: -1 },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 21,
  },
  form: { gap: spacing.md },
  label: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    color: colors.text,
    fontSize: 17,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  codeInput: { fontSize: 26, letterSpacing: 8, textAlign: 'center', fontWeight: '800' },
  linkButton: { alignItems: 'center', paddingVertical: spacing.sm },
  link: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  error: { color: colors.down, fontSize: 14, textAlign: 'center' },
  demo: { color: colors.textTertiary, fontSize: 13, textAlign: 'center' },
});
