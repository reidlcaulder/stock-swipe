// CORS is needed for the web build (supabase.functions.invoke from a browser).
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-refresh-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string, status: number): Response {
  return json({ error: message }, status);
}

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new HttpError(`${name} is not configured`, 500);
  return value;
}

/** Symbols as stored in public.stocks (e.g. AAPL, BRK.B). */
export const SYMBOL_PATTERN = /^[A-Z][A-Z0-9.\-]{0,9}$/;

export function parseSymbols(input: unknown, max: number): string[] {
  if (!Array.isArray(input)) throw new HttpError('symbols must be an array', 400);
  const symbols = [...new Set(input.map((s) => String(s).trim().toUpperCase()))];
  if (symbols.length === 0) throw new HttpError('symbols must not be empty', 400);
  if (symbols.length > max) throw new HttpError(`at most ${max} symbols per request`, 400);
  for (const symbol of symbols) {
    if (!SYMBOL_PATTERN.test(symbol)) throw new HttpError(`invalid symbol: ${symbol}`, 400);
  }
  return symbols;
}

/** Small per-isolate TTL cache. Isolates are short-lived, so this only smooths bursts. */
export class TtlCache<T> {
  private entries = new Map<string, { value: T; expiresAt: number }>();

  get(key: string, now = Date.now()): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= now) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number, now = Date.now()): void {
    this.entries.set(key, { value, expiresAt: now + ttlMs });
  }
}
