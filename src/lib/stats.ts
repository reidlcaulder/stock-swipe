import type { Quote, Stock } from '@/api/types';
import type { Stat } from '@/components/stat-grid';
import { formatCompact, formatNumber, formatPrice } from '@/lib/format';

function range(low: number | null, high: number | null, format: (n: number) => string): string {
  if (low == null || high == null) return '—';
  return `${format(low)} – ${format(high)}`;
}

const whole = (n: number) => formatNumber(n, n >= 100 ? 0 : 2);

export function cardStats(stock: Stock): Stat[] {
  return [
    { label: 'Market cap', value: formatCompact(stock.marketCap, '$') },
    { label: 'P/E (TTM)', value: formatNumber(stock.peRatio, 1) },
    { label: '52W range', value: range(stock.week52Low, stock.week52High, whole) },
    {
      label: 'Div yield',
      value: stock.dividendYield != null ? `${formatNumber(stock.dividendYield, 2)}%` : '—',
    },
  ];
}

export function detailStats(stock: Stock, quote: Quote | undefined): Stat[] {
  return [
    { label: 'Market cap', value: formatCompact(stock.marketCap, '$') },
    { label: 'P/E (TTM)', value: formatNumber(stock.peRatio, 1) },
    { label: 'Prev close', value: formatPrice(quote?.previousClose) },
    { label: 'Day range', value: range(quote?.dayLow ?? null, quote?.dayHigh ?? null, whole) },
    { label: '52W low', value: formatPrice(stock.week52Low) },
    { label: '52W high', value: formatPrice(stock.week52High) },
    { label: 'Volume', value: formatCompact(quote?.volume) },
    { label: 'Beta', value: formatNumber(stock.beta, 2) },
    {
      label: 'Div yield',
      value: stock.dividendYield != null ? `${formatNumber(stock.dividendYield, 2)}%` : '—',
    },
    { label: 'Exchange', value: stock.exchange ?? '—' },
  ];
}
