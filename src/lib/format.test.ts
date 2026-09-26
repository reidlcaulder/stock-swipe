import { formatChange, formatCompact, formatNumber, formatPercent, formatPrice } from '@/lib/format';

const MINUS = '−';

describe('formatPrice', () => {
  it('adds thousands separators and two decimals', () => {
    expect(formatPrice(1234.5)).toBe('$1,234.50');
    expect(formatPrice(231.4)).toBe('$231.40');
  });
  it('uses four decimals under a dollar', () => {
    expect(formatPrice(0.1234)).toBe('$0.1234');
  });
  it('renders missing values as an em dash', () => {
    expect(formatPrice(null)).toBe('—');
    expect(formatPrice(undefined)).toBe('—');
    expect(formatPrice(Number.NaN)).toBe('—');
  });
});

describe('formatChange / formatPercent', () => {
  it('signs positive and negative moves', () => {
    expect(formatChange(1.5)).toBe('+1.50');
    expect(formatChange(-12.345)).toBe(`${MINUS}12.35`);
    expect(formatChange(0)).toBe('0.00');
    expect(formatPercent(0.456)).toBe('+0.46%');
    expect(formatPercent(-2)).toBe(`${MINUS}2.00%`);
  });
  it('keeps precision on sub-dollar changes', () => {
    expect(formatChange(0.0123)).toBe('+0.012');
  });
});

describe('formatCompact', () => {
  it('scales to T/B/M/K', () => {
    expect(formatCompact(3.45e12, '$')).toBe('$3.45T');
    expect(formatCompact(550e9, '$')).toBe('$550B');
    expect(formatCompact(12_300_000)).toBe('12.3M');
    expect(formatCompact(999)).toBe('999');
  });
  it('drops trailing zeros', () => {
    expect(formatCompact(2e9, '$')).toBe('$2B');
  });
});

describe('formatNumber', () => {
  it('formats with the requested digits', () => {
    expect(formatNumber(29.4321, 1)).toBe('29.4');
    expect(formatNumber(1234567, 0)).toBe('1,234,567');
    expect(formatNumber(null)).toBe('—');
  });
});
