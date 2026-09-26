import { assertEquals } from 'jsr:@std/assert@1';

import { toStockProfile } from './finnhub.ts';

Deno.test('maps profile2 + metric into stock columns', () => {
  const row = toStockProfile(
    {
      name: 'Apple Inc',
      exchange: 'NASDAQ NMS - GLOBAL MARKET',
      finnhubIndustry: 'Technology',
      logo: 'https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/AAPL.png',
      weburl: 'https://www.apple.com/',
      marketCapitalization: 3_500_000,
      shareOutstanding: 15_000,
    },
    { metric: { peBasicExclExtraTTM: 33.1, '52WeekHigh': 260, '52WeekLow': 170, beta: 1.2 } },
  );
  assertEquals(row, {
    name: 'Apple Inc',
    exchange: 'NASDAQ NMS - GLOBAL MARKET',
    industry: 'Technology',
    logo_url: 'https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/AAPL.png',
    website: 'https://www.apple.com/',
    market_cap: 3_500_000_000_000,
    shares_outstanding: 15_000_000_000,
    pe_ratio: 33.1,
    week52_high: 260,
    week52_low: 170,
    beta: 1.2,
    dividend_yield: null,
  });
});

Deno.test('prefers peTTM and ignores non-numeric metrics', () => {
  const row = toStockProfile({ name: 'X' }, {
    metric: { peTTM: 12, peBasicExclExtraTTM: 99, beta: 'n/a' },
  });
  assertEquals(row?.pe_ratio, 12);
  assertEquals(row?.beta, null);
});

Deno.test('unknown symbol (empty profile) maps to null', () => {
  assertEquals(toStockProfile({}, null), null);
  assertEquals(toStockProfile({ name: '  ' }, null), null);
});
