// Finnhub client + mapping into public.stocks columns.

export interface FinnhubProfile {
  name?: string;
  exchange?: string;
  finnhubIndustry?: string;
  logo?: string;
  weburl?: string;
  /** Millions of USD. */
  marketCapitalization?: number;
  /** Millions of shares. */
  shareOutstanding?: number;
}

export interface FinnhubMetrics {
  metric?: Record<string, number | string | null | undefined>;
}

/** Columns of public.stocks that the refresh job owns. */
export interface StockProfileRow {
  name: string;
  exchange: string | null;
  industry: string | null;
  logo_url: string | null;
  website: string | null;
  market_cap: number | null;
  shares_outstanding: number | null;
  pe_ratio: number | null;
  week52_high: number | null;
  week52_low: number | null;
  beta: number | null;
  dividend_yield: number | null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function firstNum(metric: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = num(metric[key]);
    if (value != null) return value;
  }
  return null;
}

/** Returns null when Finnhub doesn't know the symbol (empty profile). */
export function toStockProfile(
  profile: FinnhubProfile,
  metrics: FinnhubMetrics | null,
): StockProfileRow | null {
  const name = text(profile.name);
  if (!name) return null;
  const metric = (metrics?.metric ?? {}) as Record<string, unknown>;
  const marketCapMillions = num(profile.marketCapitalization);
  const sharesMillions = num(profile.shareOutstanding);
  return {
    name,
    exchange: text(profile.exchange),
    industry: text(profile.finnhubIndustry),
    logo_url: text(profile.logo),
    website: text(profile.weburl),
    market_cap: marketCapMillions != null ? marketCapMillions * 1e6 : null,
    shares_outstanding: sharesMillions != null ? sharesMillions * 1e6 : null,
    pe_ratio: firstNum(metric, [
      'peTTM',
      'peBasicExclExtraTTM',
      'peExclExtraTTM',
      'peNormalizedAnnual',
    ]),
    week52_high: firstNum(metric, ['52WeekHigh']),
    week52_low: firstNum(metric, ['52WeekLow']),
    beta: firstNum(metric, ['beta']),
    dividend_yield: firstNum(metric, ['dividendYieldIndicatedAnnual', 'currentDividendYieldTTM']),
  };
}

export class FinnhubRateLimitError extends Error {}

export async function finnhubGet<T>(apiKey: string, path: string, params: Record<string, string>) {
  const url = new URL(`https://finnhub.io/api/v1${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const res = await fetch(url, { headers: { 'X-Finnhub-Token': apiKey } });
  if (res.status === 429) throw new FinnhubRateLimitError('Finnhub rate limit reached');
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Finnhub ${path} returned ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}
