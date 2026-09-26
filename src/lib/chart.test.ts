import { buildChartPaths } from '@/lib/chart';

describe('buildChartPaths', () => {
  const points = [
    { t: 1, c: 10 },
    { t: 2, c: 20 },
    { t: 3, c: 15 },
  ];

  it('spaces points evenly and maps the max to the top padding', () => {
    const { line } = buildChartPaths(points, 200, 116);
    // height 116 - 2 * 8 padding = 100px usable; 20 is max (y=8), 10 is min (y=108).
    expect(line).toBe('M0,108 L100,8 L200,58');
  });

  it('closes the area along the bottom edge', () => {
    const { area } = buildChartPaths(points, 200, 116);
    expect(area.endsWith('L200,116 L0,116 Z')).toBe(true);
  });

  it('includes the baseline in the vertical scale', () => {
    const { baselineY, line } = buildChartPaths(points, 200, 116, 30);
    expect(baselineY).toBe(8);
    expect(line.startsWith('M0,108')).toBe(true);
  });

  it('handles a flat series', () => {
    const { line } = buildChartPaths([{ t: 1, c: 5 }, { t: 2, c: 5 }], 100, 116);
    expect(line).toBe('M0,58 L100,58');
  });
});
