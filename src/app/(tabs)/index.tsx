import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useRef } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Stock, SwipeDirection } from '@/api';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Icon, type IconName } from '@/components/icon';
import { MarketStatusBadge } from '@/components/market-status-badge';
import { StockCard } from '@/components/stock-card';
import { SwipeDeck, type SwipeDeckHandle } from '@/components/swipe-deck';
import { useDeck } from '@/hooks/deck-provider';
import { useQuotes } from '@/hooks/use-market';
import { config } from '@/lib/config';
import { colors, radius, spacing } from '@/theme';

/** Cards whose prices are kept live (top of the deck plus the next two). */
const LIVE_CARDS = 3;

export default function DiscoverScreen() {
  const deck = useDeck();
  const deckRef = useRef<SwipeDeckHandle>(null);
  const liveSymbols = deck.cards.slice(0, LIVE_CARDS).map((s) => s.symbol);
  const quotes = useQuotes(liveSymbols);

  const onSwiped = (stock: Stock, direction: SwipeDirection) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(
        direction === 'right' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
      );
    }
    deck.swipe(stock, direction);
  };

  const openDetails = (symbol: string) =>
    router.push({ pathname: '/stock/[symbol]', params: { symbol } });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.wordmark}>StockSwipe</Text>
        <View style={styles.headerRight}>
          {config.useMocks ? <Text style={styles.demo}>Demo data</Text> : null}
          <MarketStatusBadge market={quotes.data?.market} />
        </View>
      </View>

      {deck.notice ? (
        <Pressable style={styles.notice} onPress={deck.dismissNotice}>
          <Text style={styles.noticeText}>{deck.notice}</Text>
        </Pressable>
      ) : null}

      <View style={styles.deckArea}>
        {deck.status === 'ready' ? (
          <SwipeDeck
            ref={deckRef}
            items={deck.cards}
            keyExtractor={(stock) => stock.symbol}
            onSwiped={onSwiped}
            renderCard={(stock, index) => (
              <StockCard
                stock={stock}
                quote={quotes.data?.quotes[stock.symbol]}
                loadChart={index < 2}
                onOpenDetails={() => openDetails(stock.symbol)}
              />
            )}
          />
        ) : deck.status === 'loading' ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        ) : deck.status === 'error' ? (
          <EmptyState
            icon="discover"
            title="Couldn't load stocks"
            message={deck.error ?? 'Check your connection and try again.'}
            action={<Button label="Try again" onPress={deck.retry} />}
          />
        ) : (
          <EmptyState
            icon="discover"
            title="You've seen them all"
            message="Every stock in the deck has been swiped. Bring back the ones you passed on?"
            action={
              <Button label="Show passed stocks" icon="reset" onPress={deck.resetPasses} />
            }
          />
        )}
      </View>

      <View style={styles.actions}>
        <ActionButton
          icon="pass"
          label="Pass"
          color={colors.down}
          size={64}
          disabled={deck.status !== 'ready'}
          onPress={() => deckRef.current?.swipe('left')}
        />
        <ActionButton
          icon="info"
          label="Details"
          color={colors.accent}
          size={50}
          disabled={deck.status !== 'ready'}
          onPress={() => deck.cards[0] && openDetails(deck.cards[0].symbol)}
        />
        <ActionButton
          icon="watch"
          label="Watch"
          color={colors.up}
          size={64}
          disabled={deck.status !== 'ready'}
          onPress={() => deckRef.current?.swipe('right')}
        />
      </View>
    </SafeAreaView>
  );
}

interface ActionButtonProps {
  icon: IconName;
  label: string;
  color: string;
  size: number;
  disabled: boolean;
  onPress: () => void;
}

function ActionButton({ icon, label, color, size, disabled, onPress }: ActionButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.actionButton,
        { width: size, height: size, borderRadius: size / 2, borderColor: `${color}55` },
        pressed && { backgroundColor: `${color}22`, transform: [{ scale: 0.94 }] },
        disabled && styles.disabled,
      ]}>
      <Icon name={icon} color={color} size={size * 0.45} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  wordmark: { color: colors.text, fontSize: 26, fontWeight: '900', letterSpacing: -1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  demo: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  notice: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  noticeText: { color: colors.down, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  deckArea: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1.5,
  },
  disabled: { opacity: 0.35 },
});
