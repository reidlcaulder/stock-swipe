// Quote, ChartPoint, MarketStatus and ChartRange mirror the market Edge Function
// (supabase/functions/_shared/alpaca.ts); keep them in sync.

export type ChartRange = '1D' | '1W' | '1M' | '1Y';
export const CHART_RANGES: readonly ChartRange[] = ['1D', '1W', '1M', '1Y'];

export type SwipeDirection = 'left' | 'right';

/** A row of public.stocks, camel-cased. Prices are not stored; see Quote. */
export interface Stock {
  symbol: string;
  name: string;
  exchange: string | null;
  industry: string | null;
  logoUrl: string | null;
  website: string | null;
  marketCap: number | null;
  peRatio: number | null;
  week52High: number | null;
  week52Low: number | null;
  beta: number | null;
  dividendYield: number | null;
}

export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  volume: number | null;
  updatedAt: string | null;
}

export interface MarketStatus {
  isOpen: boolean;
  nextOpen: string | null;
  nextClose: string | null;
}

export interface QuotesResult {
  quotes: Record<string, Quote>;
  market: MarketStatus | null;
}

export interface ChartPoint {
  /** Epoch milliseconds. */
  t: number;
  /** Close price. */
  c: number;
}

export interface WatchlistItem {
  stock: Stock;
  addedAt: string;
}

/** Everything the screens need from the backend. See supabase-api.ts and mock-api.ts. */
export interface Api {
  /** Random batch of stocks the user hasn't swiped, skipping `exclude`. */
  getDeck(limit: number, exclude: string[]): Promise<Stock[]>;
  recordSwipe(symbol: string, direction: SwipeDirection): Promise<void>;
  /** Makes passed (left-swiped) stocks eligible for the deck again. */
  resetPasses(): Promise<void>;
  getWatchlist(): Promise<WatchlistItem[]>;
  addToWatchlist(symbol: string): Promise<void>;
  removeFromWatchlist(symbol: string): Promise<void>;
  getStock(symbol: string): Promise<Stock | null>;
  getQuotes(symbols: string[]): Promise<QuotesResult>;
  getChart(symbol: string, range: ChartRange): Promise<ChartPoint[]>;
}
