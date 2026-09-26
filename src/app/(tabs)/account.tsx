import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-provider';
import { Button } from '@/components/button';
import { useDeck } from '@/hooks/deck-provider';
import { config } from '@/lib/config';
import { colors, radius, spacing } from '@/theme';

export default function AccountScreen() {
  const { user, signOut } = useAuth();
  const deck = useDeck();
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const resetPasses = async () => {
    setResetting(true);
    setMessage(null);
    try {
      await deck.resetPasses();
      setMessage('Passed stocks will show up in Discover again.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Couldn't reset passes");
    } finally {
      setResetting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Account</Text>

        <View style={styles.section}>
          <Text style={styles.label}>Signed in as</Text>
          <Text style={styles.value}>{user?.email ?? 'Unknown'}</Text>
        </View>

        <View style={styles.actions}>
          <Button
            label="Show passed stocks again"
            icon="reset"
            variant="secondary"
            onPress={resetPasses}
            loading={resetting}
          />
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <Button label="Sign out" icon="signOut" variant="danger" onPress={() => signOut()} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footnote}>
            {config.useMocks
              ? 'Demo mode: prices, charts and company data are simulated and reset when the app restarts.'
              : 'Real-time prices from IEX via Alpaca. Company data from Finnhub. Not investment advice.'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.xl },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', letterSpacing: -1 },
  section: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 4,
  },
  label: { color: colors.textTertiary, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  value: { color: colors.text, fontSize: 17, fontWeight: '600' },
  actions: { gap: spacing.md },
  message: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
  footer: { marginTop: spacing.lg },
  footnote: { color: colors.textTertiary, fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
