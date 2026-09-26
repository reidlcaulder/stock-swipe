import { mockApi, mockChart, mockPrice } from '@/api/mock-api';
import { MOCK_STOCKS } from '@/api/mock-data';

describe('mock market data', () => {
  it('ends every chart at the current mock price', () => {
    const now = Date.UTC(2026, 8, 25, 17);
    const stock = MOCK_STOCKS[0];
    for (const range of ['1D', '1W', '1M', '1Y'] as const) {
      const points = mockChart(stock.symbol, range, now);
      expect(points.length).toBeGreaterThan(10);
      expect(points[points.length - 1]).toEqual({ t: now, c: mockPrice(stock.symbol, stock.basePrice, now) });
    }
  });

  it('is deterministic for a given time', () => {
    const now = Date.UTC(2026, 8, 25, 17);
    expect(mockChart('AAPL', '1M', now)).toEqual(mockChart('AAPL', '1M', now));
  });

  it('returns no chart or quote for unknown symbols', async () => {
    expect(mockChart('NOPE', '1D', Date.now())).toEqual([]);
    const result = await mockApi.getQuotes(['NOPE', 'AAPL']);
    expect(Object.keys(result.quotes)).toEqual(['AAPL']);
  });
});

describe('mock backend', () => {
  it('drops swiped stocks from the deck and watchlists right swipes', async () => {
    const deck = await mockApi.getDeck(100, []);
    expect(deck).toHaveLength(MOCK_STOCKS.length);
    expect(deck[0]).not.toHaveProperty('basePrice');

    await mockApi.recordSwipe('AAPL', 'right');
    await mockApi.recordSwipe('TSLA', 'left');
    const next = await mockApi.getDeck(100, ['MSFT']);
    expect(next.map((s) => s.symbol)).not.toEqual(expect.arrayContaining(['AAPL']));
    expect(next.map((s) => s.symbol)).not.toContain('TSLA');
    expect(next.map((s) => s.symbol)).not.toContain('MSFT');
    expect((await mockApi.getWatchlist()).map((i) => i.stock.symbol)).toEqual(['AAPL']);

    await mockApi.resetPasses();
    const afterReset = (await mockApi.getDeck(100, [])).map((s) => s.symbol);
    expect(afterReset).toContain('TSLA');
    expect(afterReset).not.toContain('AAPL');
  });
});

describe('mock 1D chart', () => {
  it('opens at the previous close and ends at the current price', () => {
    const now = Date.UTC(2026, 8, 25, 17);
    const stock = MOCK_STOCKS[1];
    const points = mockChart(stock.symbol, '1D', now);
    expect(points[0].c).toBeCloseTo(stock.basePrice, 1);
    expect(points[points.length - 1].c).toBe(mockPrice(stock.symbol, stock.basePrice, now));
  });
});
