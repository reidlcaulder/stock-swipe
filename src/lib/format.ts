// Hand-rolled formatters: Hermes' Intl support differs between iOS and Android
// (e.g. compact notation), so these avoid Intl entirely for consistent output.

const MINUS = '−';

function withThousands(value: string): string {
  const [int, frac] = value.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac != null ? `${grouped}.${frac}` : grouped;
}

export function formatPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const digits = Math.abs(value) < 1 ? 4 : 2;
  const sign = value < 0 ? MINUS : '';
  return `${sign}$${withThousands(Math.abs(value).toFixed(digits))}`;
}

export function formatChange(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const digits = Math.abs(value) < 1 && value !== 0 ? 3 : 2;
  const sign = value > 0 ? '+' : value < 0 ? MINUS : '';
  return `${sign}${withThousands(Math.abs(value).toFixed(digits))}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : value < 0 ? MINUS : '';
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

const COMPACT_UNITS: [number, string][] = [
  [1e12, 'T'],
  [1e9, 'B'],
  [1e6, 'M'],
  [1e3, 'K'],
];

export function formatCompact(value: number | null | undefined, prefix = ''): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  const sign = value < 0 ? MINUS : '';
  for (const [size, unit] of COMPACT_UNITS) {
    if (abs >= size) {
      const scaled = abs / size;
      const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
      return `${sign}${prefix}${Number(scaled.toFixed(digits))}${unit}`;
    }
  }
  return `${sign}${prefix}${Number(abs.toFixed(2))}`;
}

export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return (value < 0 ? MINUS : '') + withThousands(Math.abs(value).toFixed(digits));
}
