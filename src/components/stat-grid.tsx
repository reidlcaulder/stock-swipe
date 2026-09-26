import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

export interface Stat {
  label: string;
  value: string;
}

export function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <View style={styles.grid}>
      {stats.map((stat) => (
        <View key={stat.label} style={styles.cell}>
          <Text style={styles.label} numberOfLines={1}>
            {stat.label}
          </Text>
          <Text style={styles.value} numberOfLines={1}>
            {stat.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  label: {
    color: colors.textTertiary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  value: { color: colors.text, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
