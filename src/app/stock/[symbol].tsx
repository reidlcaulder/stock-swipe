import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ChartRange } from '@/api';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { MarketStatusBadge } from '@/components/market-status-badge';
import { PriceChange } from '@/components/price-change';
import { PriceChart } from '@/components/price-chart';
import { RangeSelector } from '@/components/range-selector';
import { StatGrid } from '@/components/stat-grid';
import { StockLogo } from '@/components/stock-logo';
import { useChart, useQuotes, useStock } from '@/hooks/use-market';
import { useWatchlist, useWatchlistMutations } from '@/hooks/use-watchlist';
import { formatPrice } from '@/lib/format';
import { detailStats } from '@/lib/stats';
import { colors, radius, spacing } from '@/theme';

export default function StockDetailScreen() {
  const params = useLocalSearchParams<{ symbol: string }>();
  const symbol = String(params.symbol ?? '').toUpperCase();
  const [range, setRange] = useState<ChartRange>('1D');

  const stock = useStock(symbol);
  const quotes = useQuotes([symbol]);
  const chart = useChart(symbol, range);
  const watchlist = useWatchlist();
  const { add, remove } = useWatchlistMutations();

  const quote = quotes.data?.quotes[symbol];
  const watching = watchlist.data?.some((item) => item.stock.symbol === symbol) ?? false;

  if (stock.isPending) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: symbol }} />
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (stock.isError || !stock.data) {
    return (
      <>
        <Stack.Screen options={{ title: symbol }} />
        <EmptyState
          icon="info"
          title="Stock not found"
          message={stock.error?.message ?? `${symbol} isn't in the StockSwipe universe.`}
        />
      </>
    );
  }

  const data = stock.data;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: data.symbol }} />

      <View style={styles.header}>
        <StockLogo symbol={data.symbol} logoUrl={data.logoUrl} size={52} />
        <View style={styles.titles}>
          <Text style={styles.name}>{data.name}</Text>
          {data.industry ? <Text style={styles.industry}>{data.industry}</Text> : null}
        </View>
        <MarketStatusBadge market={quotes.data?.market} />
      </View>

      <View>
        <Text style={styles.price}>{formatPrice(quote?.price)}</Text>
        <PriceChange quote={quote} />
      </View>

      <View style={styles.chart}>
        <PriceChart
          id={`detail-${data.symbol}`}
          points={chart.data}
          loading={chart.isLoading}
          baseline={range === '1D' ? quote?.previousClose : null}
        />
      </View>
      <RangeSelector value={range} onChange={setRange} />

      <Button
        label={watching ? 'Remove from watchlist' : 'Add to watchlist'}
        icon={watching ? 'trash' : 'watch'}
        variant={watching ? 'secondary' : 'primary'}
        onPress={() => (watching ? remove.mutate(data.symbol) : add.mutate(data))}
      />

      <StatGrid stats={detailStats(data, quote)} />

      {data.website ? (
        <Pressable
          onPress={() => Linking.openURL(data.website!)}
          style={styles.website}
          accessibilityRole="link">
          <Icon name="website" size={18} color={colors.accent} />
          <Text style={styles.websiteText} numberOfLines={1}>
            {data.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  titles: { flex: 1 },
  name: { color: colors.text, fontSize: 20, fontWeight: '800' },
  industry: { color: colors.textTertiary, fontSize: 14, fontWeight: '600' },
  price: {
    color: colors.text,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  chart: { height: 220, marginHorizontal: -spacing.xl },
  website: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
  },
  websiteText: { color: colors.accent, fontSize: 15, fontWeight: '700', flex: 1 },
});
