import {
  findMockStock,
  MOCK_STOCKS,
  seededRandom,
  symbolSeed,
  toPublicStock,
} from '@/api/mock-data';
import type { Api, ChartPoint, ChartRange, Quote, SwipeDirection } from '@/api/types';

// In-memory backend for demo mode. State resets when the app reloads.
const swipes = new Map<string, SwipeDirection>();
const watchlist = new Map<string, string>();

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function dayMove(symbol: string, now: number): number {
  const day = Math.floor(now / 86_400_000);
  return (seededRandom(symbolSeed(symbol) + day)() - 0.5) * 0.06;
}

/** Price drifts smoothly over time so polling shows "live" movement. */
export function mockPrice(symbol: string, basePrice: number, now: number): number {
  const seed = symbolSeed(symbol);
  const wave = 0.004 * Math.sin(now / 45_000 + seed) + 0.002 * Math.sin(now / 9_000 + seed / 7);
  return Number((basePrice * (1 + dayMove(symbol, now) + wave)).toFixed(2));
}

function mockQuote(symbol: string, now: number): Quote | null {
  const stock = findMockStock(symbol);
  if (!stock) return null;
  const price = mockPrice(symbol, stock.basePrice, now);
  const change = price - stock.basePrice;
  return {
    symbol,
    price,
    change,
    changePercent: (change / stock.basePrice) * 100,
    previousClose: stock.basePrice,
    dayHigh: Math.max(price, stock.basePrice) * 1.004,
    dayLow: Math.min(price, stock.basePrice) * 0.996,
    volume: Math.round(1e6 + seededRandom(symbolSeed(symbol))() * 5e7),
    updatedAt: new Date(now).toISOString(),
  };
}

const RANGE_POINTS: Record<ChartRange, { count: number; stepMs: number; volatility: number }> = {
  '1D': { count: 78, stepMs: 5 * 60_000, volatility: 0.0015 },
  '1W': { count: 65, stepMs: 30 * 60_000, volatility: 0.004 },
  '1M': { count: 22, stepMs: 86_400_000, volatility: 0.012 },
  '1Y': { count: 252, stepMs: 86_400_000, volatility: 0.015 },
};

export function mockChart(symbol: string, range: ChartRange, now: number): ChartPoint[] {
  const stock = findMockStock(symbol);
  if (!stock) return [];
  const { count, stepMs, volatility } = RANGE_POINTS[range];
  const random = seededRandom(symbolSeed(symbol) + range.charCodeAt(1) * 7919);
  // Walk backwards from the current price so the chart ends where the quote is.
  const closes = [mockPrice(symbol, stock.basePrice, now)];
  for (let i = 1; i < count; i++) {
    const previous = closes[closes.length - 1];
    closes.push(previous * (1 - (random() - 0.48) * volatility * 2));
  }
  closes.reverse();
  if (range === '1D') {
    // Tilt the walk so the session opens at the previous close (matches the quote).
    const drift = stock.basePrice - closes[0];
    closes.forEach((c, i) => (closes[i] = c + drift * (1 - i / (count - 1))));
  }
  return closes.map((c, i) => ({ t: now - (count - 1 - i) * stepMs, c: Number(c.toFixed(2)) }));
}

export const mockApi: Api = {
  async getDeck(limit, exclude) {
    await delay(250);
    const skip = new Set(exclude);
    const candidates = MOCK_STOCKS.filter((s) => !swipes.has(s.symbol) && !skip.has(s.symbol));
    return candidates
      .map((stock) => ({ stock, order: Math.random() }))
      .sort((a, b) => a.order - b.order)
      .slice(0, limit)
      .map(({ stock }) => toPublicStock(stock));
  },

  async recordSwipe(symbol, direction) {
    await delay(150);
    swipes.set(symbol, direction);
    if (direction === 'right' && !watchlist.has(symbol)) {
      watchlist.set(symbol, new Date().toISOString());
    }
  },

  async resetPasses() {
    await delay(150);
    for (const [symbol, direction] of swipes) {
      if (direction === 'left') swipes.delete(symbol);
    }
  },

  async getWatchlist() {
    await delay(200);
    return [...watchlist.entries()]
      .sort(([, a], [, b]) => b.localeCompare(a))
      .flatMap(([symbol, addedAt]) => {
        const stock = findMockStock(symbol);
        return stock ? [{ stock: toPublicStock(stock), addedAt }] : [];
      });
  },

  async addToWatchlist(symbol) {
    await delay(150);
    if (!watchlist.has(symbol)) watchlist.set(symbol, new Date().toISOString());
  },

  async removeFromWatchlist(symbol) {
    await delay(150);
    watchlist.delete(symbol);
  },

  async getStock(symbol) {
    await delay(150);
    const stock = findMockStock(symbol);
    return stock ? toPublicStock(stock) : null;
  },

  async getQuotes(symbols) {
    await delay(200);
    const now = Date.now();
    const quotes: Record<string, Quote> = {};
    for (const symbol of symbols) {
      const quote = mockQuote(symbol, now);
      if (quote) quotes[symbol] = quote;
    }
    return { quotes, market: { isOpen: true, nextOpen: null, nextClose: null } };
  },

  async getChart(symbol, range) {
    await delay(300);
    return mockChart(symbol, range, Date.now());
  },
};
