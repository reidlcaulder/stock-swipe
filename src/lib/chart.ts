import type { ChartPoint } from '@/api/types';

export interface ChartPaths {
  line: string;
  area: string;
  baselineY: number | null;
}

const PADDING_Y = 8;

/**
 * SVG path strings for a line + filled area chart. Points are spaced evenly by
 * index (not time) so overnight and weekend gaps don't leave empty stretches.
 */
export function buildChartPaths(
  points: ChartPoint[],
  width: number,
  height: number,
  baseline: number | null = null,
): ChartPaths {
  const values = points.map((p) => p.c);
  const withBaseline = baseline != null ? [...values, baseline] : values;
  let min = Math.min(...withBaseline);
  let max = Math.max(...withBaseline);
  if (max === min) {
    max += 1;
    min -= 1;
  }
  const usable = Math.max(height - PADDING_Y * 2, 1);
  const y = (value: number) => PADDING_Y + ((max - value) / (max - min)) * usable;
  const stepX = points.length > 1 ? width / (points.length - 1) : 0;
  const coords = values.map((v, i) => [i * stepX, y(v)] as const);

  const round = (n: number) => Math.round(n * 100) / 100;
  const line = coords
    .map(([cx, cy], i) => `${i === 0 ? 'M' : 'L'}${round(cx)},${round(cy)}`)
    .join(' ');
  const area = `${line} L${round(width)},${height} L0,${height} Z`;

  return { line, area, baselineY: baseline != null ? round(y(baseline)) : null };
}
