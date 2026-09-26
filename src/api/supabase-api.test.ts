import { toStock } from '@/api/supabase-api';

jest.mock('@/lib/supabase', () => ({ getSupabase: jest.fn() }));

describe('toStock', () => {
  it('camel-cases columns and parses numeric strings', () => {
    expect(
      toStock({
        symbol: 'AAPL',
        name: 'Apple Inc',
        exchange: 'NASDAQ',
        industry: 'Technology',
        logo_url: 'https://example.com/aapl.png',
        website: 'https://apple.com',
        market_cap: '3450000000000',
        pe_ratio: 34.2,
        week52_high: '260.1',
        week52_low: null,
        beta: 'not a number',
        dividend_yield: 0.44,
      }),
    ).toEqual({
      symbol: 'AAPL',
      name: 'Apple Inc',
      exchange: 'NASDAQ',
      industry: 'Technology',
      logoUrl: 'https://example.com/aapl.png',
      website: 'https://apple.com',
      marketCap: 3.45e12,
      peRatio: 34.2,
      week52High: 260.1,
      week52Low: null,
      beta: null,
      dividendYield: 0.44,
    });
  });
});
