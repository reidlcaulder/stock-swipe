// Refreshes company profiles and key metrics in public.stocks from Finnhub.
// Called every 10 minutes by pg_cron (see migrations); each call handles a
// small batch of the stalest rows to stay under Finnhub's free-tier limit.
//
// POST {}                          -> refresh up to DEFAULT_BATCH stale symbols
// POST { "symbols": ["AAPL"] }     -> refresh specific symbols now
// POST { "limit": 5 }              -> smaller/larger batch (max MAX_BATCH)
//
// verify_jwt is off for this function (supabase/config.toml); callers must send
// the x-refresh-secret header matching the REFRESH_STOCKS_SECRET secret.
// Secrets: FINNHUB_API_KEY, REFRESH_STOCKS_SECRET.

import { createClient } from 'npm:@supabase/supabase-js@2';

import {
  finnhubGet,
  type FinnhubMetrics,
  type FinnhubProfile,
  FinnhubRateLimitError,
  toStockProfile,
} from '../_shared/finnhub.ts';
import {
  corsHeaders,
  errorResponse,
  HttpError,
  json,
  parseSymbols,
  requireEnv,
} from '../_shared/http.ts';

const DEFAULT_BATCH = 20;
const MAX_BATCH = 50;
const STALE_AFTER_HOURS = 20;
// Finnhub free tier: 60 calls/minute. Two calls per symbol.
const CALL_SPACING_MS = 1_050;
// Stay well inside the Edge Function wall-clock limit.
const TIME_BUDGET_MS = 110_000;

function secretKey(): string {
  const keys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (keys) {
    const parsed = JSON.parse(keys) as Record<string, string>;
    if (parsed.default) return parsed.default;
  }
  return requireEnv('SUPABASE_SERVICE_ROLE_KEY');
}

function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i];
  return diff === 0;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const expected = requireEnv('REFRESH_STOCKS_SECRET');
    const provided = req.headers.get('x-refresh-secret') ?? '';
    if (!timingSafeEqual(provided, expected)) throw new HttpError('Unauthorized', 401);

    const body = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
    const finnhubKey = requireEnv('FINNHUB_API_KEY');
    const admin = createClient(requireEnv('SUPABASE_URL'), secretKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let symbols: string[];
    if (body.symbols !== undefined) {
      symbols = parseSymbols(body.symbols, MAX_BATCH);
    } else {
      const limit = Math.min(Math.max(Number(body.limit) || DEFAULT_BATCH, 1), MAX_BATCH);
      const cutoff = new Date(Date.now() - STALE_AFTER_HOURS * 3_600_000).toISOString();
      const { data, error } = await admin
        .from('stocks')
        .select('symbol')
        .eq('is_active', true)
        .or(`profile_updated_at.is.null,profile_updated_at.lt.${cutoff}`)
        .order('profile_updated_at', { ascending: true, nullsFirst: true })
        .limit(limit);
      if (error) throw error;
      symbols = data.map((row) => row.symbol as string);
    }

    const startedAt = Date.now();
    const summary = {
      requested: symbols.length,
      updated: 0,
      deactivated: 0,
      failed: [] as string[],
    };

    for (const symbol of symbols) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) break;
      try {
        const profile = await finnhubGet<FinnhubProfile>(finnhubKey, '/stock/profile2', { symbol });
        await sleep(CALL_SPACING_MS);
        let metrics: FinnhubMetrics | null = null;
        if (profile.name) {
          metrics = await finnhubGet<FinnhubMetrics>(finnhubKey, '/stock/metric', {
            symbol,
            metric: 'all',
          });
          await sleep(CALL_SPACING_MS);
        }

        const row = toStockProfile(profile, metrics);
        const now = new Date().toISOString();
        const update = row
          ? { ...row, is_active: true, profile_updated_at: now }
          : { is_active: false, profile_updated_at: now };
        const { error } = await admin.from('stocks').update(update).eq('symbol', symbol);
        if (error) throw error;
        if (row) summary.updated++;
        else summary.deactivated++;
      } catch (error) {
        if (error instanceof FinnhubRateLimitError) {
          console.warn('Finnhub rate limit hit; stopping this batch');
          break;
        }
        console.error(`refresh failed for ${symbol}`, error);
        summary.failed.push(symbol);
      }
    }

    return json(summary);
  } catch (error) {
    if (error instanceof HttpError) return errorResponse(error.message, error.status);
    console.error(error);
    return errorResponse('Refresh failed', 500);
  }
});
