import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CHART_RANGES, type ChartRange } from '@/api';
import { colors, radius } from '@/theme';

interface RangeSelectorProps {
  value: ChartRange;
  onChange: (range: ChartRange) => void;
}

export function RangeSelector({ value, onChange }: RangeSelectorProps) {
  return (
    <View style={styles.row}>
      {CHART_RANGES.map((range) => {
        const selected = range === value;
        return (
          <Pressable
            key={range}
            onPress={() => onChange(range)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[styles.chip, selected && styles.chipSelected]}>
            <Text style={[styles.label, selected && styles.labelSelected]}>{range}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.sm },
  chipSelected: { backgroundColor: colors.cardRaised },
  label: { color: colors.textTertiary, fontSize: 12, fontWeight: '800' },
  labelSelected: { color: colors.text },
});
