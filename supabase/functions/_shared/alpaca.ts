// Alpaca Market Data API v2 client + response mapping.
// The response types returned to the app (Quote, ChartPoint, MarketStatus) are
// mirrored in src/api/types.ts; keep them in sync.

export type ChartRange = '1D' | '1W' | '1M' | '1Y';
export const CHART_RANGES: readonly ChartRange[] = ['1D', '1W', '1M', '1Y'];

export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  volume: number | null;
  /** ISO time of the trade/bar the price came from. */
  updatedAt: string | null;
}

export interface ChartPoint {
  /** Epoch milliseconds. */
  t: number;
  /** Close price. */
  c: number;
}

export interface MarketStatus {
  isOpen: boolean;
  nextOpen: string | null;
  nextClose: string | null;
}

// --- Raw Alpaca shapes (only the fields we use) -----------------------------

export interface AlpacaTrade {
  t: string;
  p: number;
}

export interface AlpacaBar {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface AlpacaSnapshot {
  latestTrade?: AlpacaTrade | null;
  minuteBar?: AlpacaBar | null;
  dailyBar?: AlpacaBar | null;
  prevDailyBar?: AlpacaBar | null;
}

export interface AlpacaClock {
  is_open: boolean;
  next_open?: string;
  next_close?: string;
}

// --- Pure mapping ------------------------------------------------------------

const etDateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const etTimeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/New_York',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Calendar date (YYYY-MM-DD) in New York for an ISO timestamp. */
export function etDate(iso: string): string {
  return etDateFormat.format(new Date(iso));
}

/** True when the timestamp falls in the regular 9:30–16:00 ET session. */
export function isRegularSession(iso: string): boolean {
  const [hh, mm] = etTimeFormat.format(new Date(iso)).split(':').map(Number);
  const minutes = hh * 60 + mm;
  return minutes >= 9 * 60 + 30 && minutes < 16 * 60;
}

export function snapshotToQuote(symbol: string, snap: AlpacaSnapshot): Quote | null {
  const price = snap.latestTrade?.p ?? snap.minuteBar?.c ?? snap.dailyBar?.c;
  if (price == null) return null;
  const updatedAt = snap.latestTrade?.t ?? snap.minuteBar?.t ?? snap.dailyBar?.t ?? null;

  // dailyBar is the latest session with trades. If the latest trade belongs to
  // that session, change is measured against the session before it; otherwise
  // (e.g. pre-market, no bar for today yet) against dailyBar's close.
  const daily = snap.dailyBar ?? null;
  const sameSession = daily != null && updatedAt != null && etDate(daily.t) === etDate(updatedAt);
  const sessionBar = sameSession ? daily : null;
  const previousClose = sameSession
    ? (snap.prevDailyBar?.c ?? null)
    : (daily?.c ?? snap.prevDailyBar?.c ?? null);

  const change = previousClose ? price - previousClose : 0;
  const changePercent = previousClose ? (change / previousClose) * 100 : 0;

  return {
    symbol,
    price,
    change,
    changePercent,
    previousClose,
    dayHigh: sessionBar?.h ?? null,
    dayLow: sessionBar?.l ?? null,
    volume: sessionBar?.v ?? null,
    updatedAt,
  };
}

/** Alpaca returns `{ AAPL: {...} }`; tolerate a `{ snapshots: {...} }` wrapper too. */
export function snapshotsToQuotes(raw: unknown): Record<string, Quote> {
  const record = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const snapshots = (
    record.snapshots && typeof record.snapshots === 'object' ? record.snapshots : record
  ) as Record<string, AlpacaSnapshot | null>;
  const quotes: Record<string, Quote> = {};
  for (const [symbol, snap] of Object.entries(snapshots)) {
    if (!snap) continue;
    const quote = snapshotToQuote(symbol, snap);
    if (quote) quotes[symbol] = quote;
  }
  return quotes;
}

export function clockToMarketStatus(clock: AlpacaClock): MarketStatus {
  return {
    isOpen: clock.is_open,
    nextOpen: clock.next_open ?? null,
    nextClose: clock.next_close ?? null,
  };
}

interface RangeSpec {
  timeframe: string;
  lookbackDays: number;
  intraday: boolean;
  /** How long bars for this range may be cached. */
  ttlMs: number;
}

export const RANGE_SPECS: Record<ChartRange, RangeSpec> = {
  // Look back 5 days so a Monday morning still finds Friday's session.
  '1D': { timeframe: '5Min', lookbackDays: 5, intraday: true, ttlMs: 60_000 },
  '1W': { timeframe: '30Min', lookbackDays: 7, intraday: true, ttlMs: 5 * 60_000 },
  '1M': { timeframe: '1Day', lookbackDays: 31, intraday: false, ttlMs: 30 * 60_000 },
  '1Y': { timeframe: '1Day', lookbackDays: 366, intraday: false, ttlMs: 30 * 60_000 },
};

export function isChartRange(value: unknown): value is ChartRange {
  return typeof value === 'string' && (CHART_RANGES as readonly string[]).includes(value);
}

export function barsToPoints(range: ChartRange, bars: AlpacaBar[]): ChartPoint[] {
  const spec = RANGE_SPECS[range];
  let kept = spec.intraday ? bars.filter((b) => isRegularSession(b.t)) : bars;
  if (range === '1D' && kept.length > 0) {
    const lastSession = etDate(kept[kept.length - 1].t);
    kept = kept.filter((b) => etDate(b.t) === lastSession);
  }
  return kept.map((b) => ({ t: Date.parse(b.t), c: b.c }));
}

// --- HTTP ---------------------------------------------------------------------

export interface AlpacaConfig {
  keyId: string;
  secretKey: string;
  /** 'iex' on the free plan, 'sip' with a paid subscription. */
  feed: string;
  dataUrl: string;
  tradingUrl: string;
}

async function alpacaGet(config: AlpacaConfig, url: URL): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      'APCA-API-KEY-ID': config.keyId,
      'APCA-API-SECRET-KEY': config.secretKey,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Alpaca ${url.pathname} returned ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

export async function fetchSnapshots(config: AlpacaConfig, symbols: string[]) {
  const url = new URL('/v2/stocks/snapshots', config.dataUrl);
  url.searchParams.set('symbols', symbols.join(','));
  url.searchParams.set('feed', config.feed);
  return snapshotsToQuotes(await alpacaGet(config, url));
}

export async function fetchClock(config: AlpacaConfig): Promise<MarketStatus> {
  const url = new URL('/v2/clock', config.tradingUrl);
  return clockToMarketStatus((await alpacaGet(config, url)) as AlpacaClock);
}

export async function fetchChart(
  config: AlpacaConfig,
  symbol: string,
  range: ChartRange,
  now = new Date(),
): Promise<ChartPoint[]> {
  const spec = RANGE_SPECS[range];
  const bars: AlpacaBar[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL(`/v2/stocks/${encodeURIComponent(symbol)}/bars`, config.dataUrl);
    url.searchParams.set('timeframe', spec.timeframe);
    url.searchParams.set(
      'start',
      new Date(now.getTime() - spec.lookbackDays * 86_400_000).toISOString(),
    );
    url.searchParams.set('adjustment', 'split');
    url.searchParams.set('feed', config.feed);
    url.searchParams.set('limit', '10000');
    if (pageToken) url.searchParams.set('page_token', pageToken);
    const page = (await alpacaGet(config, url)) as {
      bars?: AlpacaBar[] | null;
      next_page_token?: string | null;
    };
    bars.push(...(page.bars ?? []));
    pageToken = page.next_page_token ?? undefined;
  } while (pageToken);
  return barsToPoints(range, bars);
}
