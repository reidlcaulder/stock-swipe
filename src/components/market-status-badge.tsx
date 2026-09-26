import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import type { MarketStatus } from '@/api';
import { colors, radius } from '@/theme';

/** Pulsing "Live" while the market is open, grey "Closed" otherwise. */
export function MarketStatusBadge({ market }: { market: MarketStatus | null | undefined }) {
  const open = market?.isOpen ?? false;
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (open) {
      pulse.value = withRepeat(withTiming(0.25, { duration: 900 }), -1, true);
    } else {
      cancelAnimation(pulse);
      pulse.value = 1;
    }
  }, [open, pulse]);

  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  if (!market) return null;
  const color = open ? colors.up : colors.textTertiary;
  return (
    <View style={[styles.badge, { borderColor: `${color}55` }]}>
      <Animated.View style={[styles.dot, { backgroundColor: color }, dotStyle]} />
      <Text style={[styles.label, { color }]}>{open ? 'Live' : 'Closed'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
});
