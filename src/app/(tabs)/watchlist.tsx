import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Quote, WatchlistItem } from '@/api';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { MarketStatusBadge } from '@/components/market-status-badge';
import { PriceChange } from '@/components/price-change';
import { StockLogo } from '@/components/stock-logo';
import { useQuotes } from '@/hooks/use-market';
import { useWatchlist, useWatchlistMutations } from '@/hooks/use-watchlist';
import { formatPrice } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';

const WATCHLIST_POLL_MS = 10_000;

export default function WatchlistScreen() {
  const watchlist = useWatchlist();
  const { remove } = useWatchlistMutations();
  const items = watchlist.data ?? [];
  // The market function accepts up to 50 symbols per call.
  const quotes = useQuotes(items.slice(0, 50).map((i) => i.stock.symbol), WATCHLIST_POLL_MS);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Watchlist</Text>
          <Text style={styles.subtitle}>
            {items.length === 1 ? '1 stock' : `${items.length} stocks`}
          </Text>
        </View>
        <MarketStatusBadge market={quotes.data?.market} />
      </View>

      {watchlist.isPending ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : watchlist.isError ? (
        <EmptyState
          icon="watchlist"
          title="Couldn't load your watchlist"
          message={watchlist.error.message}
          action={<Button label="Try again" onPress={() => watchlist.refetch()} />}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.stock.symbol}
          contentContainerStyle={items.length === 0 ? styles.emptyList : styles.list}
          refreshControl={
            <RefreshControl
              refreshing={watchlist.isRefetching}
              onRefresh={() => {
                watchlist.refetch();
                quotes.refetch();
              }}
              tintColor={colors.textSecondary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="watchlist"
              title="Nothing here yet"
              message="Swipe right on a stock in Discover to start watching it."
            />
          }
          renderItem={({ item }) => (
            <WatchlistRow
              item={item}
              quote={quotes.data?.quotes[item.stock.symbol]}
              onPress={() =>
                router.push({ pathname: '/stock/[symbol]', params: { symbol: item.stock.symbol } })
              }
              onRemove={() => remove.mutate(item.stock.symbol)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

interface WatchlistRowProps {
  item: WatchlistItem;
  quote: Quote | undefined;
  onPress: () => void;
  onRemove: () => void;
}

function WatchlistRow({ item, quote, onPress, onRemove }: WatchlistRowProps) {
  const { stock } = item;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${stock.symbol}, ${stock.name}`}>
      <StockLogo symbol={stock.symbol} logoUrl={stock.logoUrl} size={40} />
      <View style={styles.rowTitles}>
        <Text style={styles.rowSymbol}>{stock.symbol}</Text>
        <Text style={styles.rowName} numberOfLines={1}>
          {stock.name}
        </Text>
      </View>
      <View style={styles.rowPrice}>
        <Text style={styles.price}>{formatPrice(quote?.price)}</Text>
        <PriceChange quote={quote} pill />
      </View>
      <Pressable
        onPress={onRemove}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${stock.symbol} from watchlist`}
        style={styles.remove}>
        <Icon name="trash" size={18} color={colors.textTertiary} />
      </Pressable>
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
    paddingBottom: spacing.lg,
  },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', letterSpacing: -1 },
  subtitle: { color: colors.textTertiary, fontSize: 14, fontWeight: '600' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  emptyList: { flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  rowPressed: { backgroundColor: colors.cardRaised },
  rowTitles: { flex: 1 },
  rowSymbol: { color: colors.text, fontSize: 17, fontWeight: '800' },
  rowName: { color: colors.textTertiary, fontSize: 13 },
  rowPrice: { alignItems: 'flex-end', gap: 4 },
  price: { color: colors.text, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  remove: { padding: spacing.xs },
});
