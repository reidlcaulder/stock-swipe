// Live market data for the app, proxied so the Alpaca keys never ship in the client.
//
// POST { "action": "quotes", "symbols": ["AAPL", "TSLA"] }
//   -> { quotes: Record<symbol, Quote>, market: MarketStatus | null }
// POST { "action": "chart", "symbol": "AAPL", "range": "1D" | "1W" | "1M" | "1Y" }
//   -> { symbol, range, points: ChartPoint[] }
//
// verify_jwt is on (default), so only signed-in users reach this handler.
// Secrets: ALPACA_KEY_ID, ALPACA_SECRET_KEY, optional ALPACA_FEED (default "iex").

import {
  type AlpacaConfig,
  type ChartPoint,
  fetchChart,
  fetchClock,
  fetchSnapshots,
  isChartRange,
  type MarketStatus,
  type Quote,
  RANGE_SPECS,
} from '../_shared/alpaca.ts';
import {
  corsHeaders,
  errorResponse,
  HttpError,
  json,
  parseSymbols,
  requireEnv,
  SYMBOL_PATTERN,
  TtlCache,
} from '../_shared/http.ts';

const QUOTE_TTL_MS = 4_000;
const CLOCK_TTL_MS = 30_000;
const MAX_SYMBOLS = 50;

const quoteCache = new TtlCache<Quote | null>();
const clockCache = new TtlCache<MarketStatus>();
const chartCache = new TtlCache<ChartPoint[]>();

function alpacaConfig(): AlpacaConfig {
  return {
    keyId: requireEnv('ALPACA_KEY_ID'),
    secretKey: requireEnv('ALPACA_SECRET_KEY'),
    feed: Deno.env.get('ALPACA_FEED') ?? 'iex',
    dataUrl: Deno.env.get('ALPACA_DATA_URL') ?? 'https://data.alpaca.markets',
    // Paper-account keys work for market data; the clock lives on the trading API.
    tradingUrl: Deno.env.get('ALPACA_TRADING_URL') ?? 'https://paper-api.alpaca.markets',
  };
}

async function marketStatus(config: AlpacaConfig): Promise<MarketStatus | null> {
  const cached = clockCache.get('clock');
  if (cached) return cached;
  try {
    const status = await fetchClock(config);
    clockCache.set('clock', status, CLOCK_TTL_MS);
    return status;
  } catch (error) {
    console.error('clock fetch failed', error);
    return null; // Quotes are still useful without market hours.
  }
}

async function handleQuotes(body: Record<string, unknown>) {
  const symbols = parseSymbols(body.symbols, MAX_SYMBOLS);
  const config = alpacaConfig();

  const stale = symbols.filter((s) => quoteCache.get(s) === undefined);
  const [fresh, market] = await Promise.all([
    stale.length > 0 ? fetchSnapshots(config, stale) : Promise.resolve({}),
    marketStatus(config),
  ]);
  for (const symbol of stale) {
    // Cache misses too, so unknown symbols don't hit Alpaca on every poll.
    quoteCache.set(symbol, (fresh as Record<string, Quote>)[symbol] ?? null, QUOTE_TTL_MS);
  }

  const quotes: Record<string, Quote> = {};
  for (const symbol of symbols) {
    const quote = quoteCache.get(symbol);
    if (quote) quotes[symbol] = quote;
  }
  return { quotes, market };
}

async function handleChart(body: Record<string, unknown>) {
  const symbol = String(body.symbol ?? '').toUpperCase();
  if (!SYMBOL_PATTERN.test(symbol)) throw new HttpError('invalid symbol', 400);
  if (!isChartRange(body.range)) throw new HttpError('range must be 1D, 1W, 1M or 1Y', 400);
  const range = body.range;

  const key = `${symbol}:${range}`;
  let points = chartCache.get(key);
  if (!points) {
    points = await fetchChart(alpacaConfig(), symbol, range);
    chartCache.set(key, points, RANGE_SPECS[range].ttlMs);
  }
  return { symbol, range, points };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new HttpError('Expected a JSON body', 400);
    switch (body.action) {
      case 'quotes':
        return json(await handleQuotes(body));
      case 'chart':
        return json(await handleChart(body));
      default:
        throw new HttpError('action must be "quotes" or "chart"', 400);
    }
  } catch (error) {
    if (error instanceof HttpError) return errorResponse(error.message, error.status);
    console.error(error);
    return errorResponse('Market data provider request failed', 502);
  }
});
