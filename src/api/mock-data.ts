import type { Stock } from '@/api/types';

// Demo-mode universe. Figures are illustrative, not real market data.
type MockStock = Stock & { basePrice: number };

function mock(
  symbol: string,
  name: string,
  industry: string,
  basePrice: number,
  marketCap: number,
  peRatio: number | null,
  beta: number,
  dividendYield: number | null,
): MockStock {
  return {
    symbol,
    name,
    exchange: 'NASDAQ/NYSE',
    industry,
    logoUrl: null,
    website: null,
    marketCap,
    peRatio,
    week52High: Number((basePrice * 1.28).toFixed(2)),
    week52Low: Number((basePrice * 0.71).toFixed(2)),
    beta,
    dividendYield,
    basePrice,
  };
}

export const MOCK_STOCKS: MockStock[] = [
  mock('AAPL', 'Apple Inc.', 'Technology', 231.4, 3.45e12, 34.2, 1.21, 0.44),
  mock('MSFT', 'Microsoft Corporation', 'Technology', 448.9, 3.34e12, 36.8, 0.9, 0.72),
  mock('NVDA', 'NVIDIA Corporation', 'Semiconductors', 172.6, 4.21e12, 52.4, 1.68, 0.02),
  mock('TSLA', 'Tesla, Inc.', 'Automobiles', 341.2, 1.1e12, 168.3, 2.31, null),
  mock('AMZN', 'Amazon.com, Inc.', 'Retail', 219.8, 2.34e12, 38.9, 1.15, null),
  mock('META', 'Meta Platforms, Inc.', 'Media', 712.3, 1.79e12, 27.4, 1.24, 0.29),
  mock('NFLX', 'Netflix, Inc.', 'Media', 1184.5, 5.04e11, 51.2, 1.02, null),
  mock('COST', 'Costco Wholesale Corporation', 'Retail', 941.7, 4.18e11, 53.6, 0.79, 0.52),
  mock('JPM', 'JPMorgan Chase & Co.', 'Banking', 296.1, 8.2e11, 14.9, 1.08, 1.9),
  mock('LLY', 'Eli Lilly and Company', 'Pharmaceuticals', 781.2, 7.02e11, 61.7, 0.41, 0.74),
  mock('KO', 'The Coca-Cola Company', 'Beverages', 68.4, 2.94e11, 24.1, 0.47, 2.95),
  mock('PLTR', 'Palantir Technologies Inc.', 'Technology', 158.3, 3.74e11, 512.6, 2.64, null),
  mock('COIN', 'Coinbase Global, Inc.', 'Financial Services', 311.8, 8.0e10, 29.3, 3.47, null),
  mock('SBUX', 'Starbucks Corporation', 'Hotels & Restaurants', 86.2, 9.8e10, 36.1, 0.95, 2.83),
  mock('XOM', 'Exxon Mobil Corporation', 'Energy', 112.9, 4.86e11, 15.8, 0.52, 3.51),
  mock('SOFI', 'SoFi Technologies, Inc.', 'Financial Services', 24.7, 2.7e10, 48.2, 1.93, null),
];

export function findMockStock(symbol: string): MockStock | undefined {
  return MOCK_STOCKS.find((s) => s.symbol === symbol);
}

export function toPublicStock({ basePrice: _basePrice, ...stock }: MockStock): Stock {
  return stock;
}

/** Deterministic 0..1 pseudo-random generator (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function symbolSeed(symbol: string): number {
  let hash = 0;
  for (const char of symbol) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}
