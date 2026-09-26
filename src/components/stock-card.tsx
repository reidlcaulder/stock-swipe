import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ChartRange, Quote, Stock } from '@/api';
import { Icon } from '@/components/icon';
import { PriceChange } from '@/components/price-change';
import { PriceChart } from '@/components/price-chart';
import { RangeSelector } from '@/components/range-selector';
import { StatGrid } from '@/components/stat-grid';
import { StockLogo } from '@/components/stock-logo';
import { useChart } from '@/hooks/use-market';
import { formatPrice } from '@/lib/format';
import { cardStats } from '@/lib/stats';
import { colors, radius, spacing } from '@/theme';

interface StockCardProps {
  stock: Stock;
  quote: Quote | undefined;
  /** Only cards near the top of the deck load their chart. */
  loadChart: boolean;
  onOpenDetails: () => void;
}

export function StockCard({ stock, quote, loadChart, onOpenDetails }: StockCardProps) {
  const [range, setRange] = useState<ChartRange>('1M');
  const chart = useChart(stock.symbol, range, loadChart);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <StockLogo symbol={stock.symbol} logoUrl={stock.logoUrl} />
        <View style={styles.titles}>
          <Text style={styles.symbol}>{stock.symbol}</Text>
          <Text style={styles.name} numberOfLines={1}>
            {stock.name}
          </Text>
        </View>
        <Pressable
          onPress={onOpenDetails}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`More about ${stock.symbol}`}>
          <Icon name="info" color={colors.textSecondary} size={24} />
        </Pressable>
      </View>

      <View style={styles.priceRow}>
        <Text style={styles.price}>{formatPrice(quote?.price)}</Text>
        <PriceChange quote={quote} />
      </View>

      <View style={styles.chart}>
        <PriceChart
          id={`card-${stock.symbol}`}
          points={chart.data}
          loading={chart.isLoading}
          baseline={range === '1D' ? quote?.previousClose : null}
        />
      </View>
      <RangeSelector value={range} onChange={setRange} />

      <View style={styles.stats}>
        <StatGrid stats={cardStats(stock)} />
      </View>

      {stock.industry ? (
        <View style={styles.tags}>
          <Text style={styles.tag}>{stock.industry}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    overflow: 'hidden',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  titles: { flex: 1 },
  symbol: { color: colors.text, fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  name: { color: colors.textSecondary, fontSize: 14, fontWeight: '500' },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    columnGap: spacing.sm,
    marginTop: spacing.lg,
  },
  price: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  chart: { flex: 1, marginVertical: spacing.sm, marginHorizontal: -spacing.lg },
  stats: { marginTop: spacing.md },
  tags: { flexDirection: 'row', marginTop: spacing.md },
  tag: {
    color: colors.accent,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderRadius: radius.sm,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
