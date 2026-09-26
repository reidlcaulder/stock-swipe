import { FunctionsHttpError } from '@supabase/supabase-js';

import type {
  Api,
  ChartPoint,
  ChartRange,
  QuotesResult,
  Stock,
  SwipeDirection,
  WatchlistItem,
} from '@/api/types';
import { getSupabase } from '@/lib/supabase';

interface StockRow {
  symbol: string;
  name: string;
  exchange: string | null;
  industry: string | null;
  logo_url: string | null;
  website: string | null;
  market_cap: number | string | null;
  pe_ratio: number | string | null;
  week52_high: number | string | null;
  week52_low: number | string | null;
  beta: number | string | null;
  dividend_yield: number | string | null;
}

const STOCK_COLUMNS =
  'symbol, name, exchange, industry, logo_url, website, market_cap, pe_ratio, week52_high, week52_low, beta, dividend_yield';

// Postgres numeric columns can arrive as strings.
function num(value: number | string | null): number | null {
  if (value == null) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function toStock(row: StockRow): Stock {
  return {
    symbol: row.symbol,
    name: row.name,
    exchange: row.exchange,
    industry: row.industry,
    logoUrl: row.logo_url,
    website: row.website,
    marketCap: num(row.market_cap),
    peRatio: num(row.pe_ratio),
    week52High: num(row.week52_high),
    week52Low: num(row.week52_low),
    beta: num(row.beta),
    dividendYield: num(row.dividend_yield),
  };
}

async function invokeMarket<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await getSupabase().functions.invoke<T>('market', { body });
  if (error) {
    // Surface the function's { error } message instead of the generic one.
    if (error instanceof FunctionsHttpError) {
      const detail = await error.context.json().catch(() => null);
      if (detail?.error) throw new Error(detail.error);
    }
    throw error;
  }
  return data as T;
}

export const supabaseApi: Api = {
  async getDeck(limit, exclude) {
    const { data, error } = await getSupabase().rpc('get_deck', {
      p_limit: limit,
      p_exclude: exclude,
    });
    if (error) throw error;
    return (data as StockRow[]).map(toStock);
  },

  async recordSwipe(symbol: string, direction: SwipeDirection) {
    const { error } = await getSupabase().rpc('record_swipe', {
      p_symbol: symbol,
      p_direction: direction,
    });
    if (error) throw error;
  },

  async resetPasses() {
    // RLS limits the delete to the signed-in user's rows.
    const { error } = await getSupabase().from('swipes').delete().eq('direction', 'left');
    if (error) throw error;
  },

  async getWatchlist(): Promise<WatchlistItem[]> {
    const { data, error } = await getSupabase()
      .from('watchlist')
      .select(`added_at, stock:stocks!inner(${STOCK_COLUMNS})`)
      .order('added_at', { ascending: false });
    if (error) throw error;
    return (data as unknown as { added_at: string; stock: StockRow }[]).map((row) => ({
      addedAt: row.added_at,
      stock: toStock(row.stock),
    }));
  },

  async addToWatchlist(symbol) {
    // user_id defaults to auth.uid(); a duplicate (23505) means it's already there.
    const { error } = await getSupabase().from('watchlist').insert({ symbol });
    if (error && error.code !== '23505') throw error;
  },

  async removeFromWatchlist(symbol) {
    const { error } = await getSupabase().from('watchlist').delete().eq('symbol', symbol);
    if (error) throw error;
  },

  async getStock(symbol) {
    const { data, error } = await getSupabase()
      .from('stocks')
      .select(STOCK_COLUMNS)
      .eq('symbol', symbol)
      .maybeSingle();
    if (error) throw error;
    return data ? toStock(data as StockRow) : null;
  },

  getQuotes(symbols) {
    return invokeMarket<QuotesResult>({ action: 'quotes', symbols });
  },

  async getChart(symbol: string, range: ChartRange) {
    const result = await invokeMarket<{ points: ChartPoint[] }>({ action: 'chart', symbol, range });
    return result.points;
  },
};
