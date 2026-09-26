import { useState } from 'react';
import { ActivityIndicator, type LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import type { ChartPoint } from '@/api';
import { buildChartPaths } from '@/lib/chart';
import { colors } from '@/theme';

interface PriceChartProps {
  points: ChartPoint[] | undefined;
  loading?: boolean;
  /** Dashed reference line, e.g. the previous close on the 1D chart. */
  baseline?: number | null;
  /** Unique per mounted chart (SVG gradient ids are document-global on web). */
  id: string;
}

export function PriceChart({ points, loading, baseline, id }: PriceChartProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  const paths =
    points && points.length > 1 && size.width > 0
      ? buildChartPaths(points, size.width, size.height, baseline ?? null)
      : null;
  const up = points && points.length > 1 ? points[points.length - 1].c >= (baseline ?? points[0].c) : true;
  const stroke = up ? colors.up : colors.down;
  const gradientId = `chart-fill-${id}`.replace(/[^a-zA-Z0-9_-]/g, '_');

  return (
    <View style={styles.container} onLayout={onLayout}>
      {paths ? (
        <Svg width={size.width} height={size.height}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={stroke} stopOpacity={0.28} />
              <Stop offset="1" stopColor={stroke} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={paths.area} fill={`url(#${gradientId})`} />
          {paths.baselineY != null && (
            <Line
              x1={0}
              x2={size.width}
              y1={paths.baselineY}
              y2={paths.baselineY}
              stroke={colors.textTertiary}
              strokeDasharray="3 5"
              strokeWidth={1}
            />
          )}
          <Path d={paths.line} stroke={stroke} strokeWidth={2.5} fill="none" strokeLinejoin="round" />
        </Svg>
      ) : size.width === 0 ? null : (
        <View style={styles.placeholder}>
          {loading ? (
            <ActivityIndicator color={colors.textTertiary} />
          ) : (
            <Text style={styles.placeholderText}>No chart data</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 120 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { color: colors.textTertiary, fontSize: 13 },
});
