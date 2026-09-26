import { StyleSheet, Text, View } from 'react-native';

import type { Quote } from '@/api';
import { formatChange, formatPercent } from '@/lib/format';
import { changeColor, radius } from '@/theme';

/** "+1.23 (+0.45%)" in green/red, or a pill with just the percent. */
export function PriceChange({ quote, pill = false }: { quote: Quote | undefined; pill?: boolean }) {
  const color = changeColor(quote?.change);
  if (pill) {
    return (
      <View style={[styles.pill, { backgroundColor: `${color}22` }]}>
        <Text style={[styles.pillText, { color }]}>{formatPercent(quote?.changePercent)}</Text>
      </View>
    );
  }
  return (
    <Text style={[styles.text, { color }]}>
      {formatChange(quote?.change)} ({formatPercent(quote?.changePercent)})
    </Text>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  pill: {
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 76,
    alignItems: 'center',
  },
  pillText: { fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
