import { assertAlmostEquals, assertEquals } from 'jsr:@std/assert@1';

import { barsToPoints, snapshotsToQuotes, snapshotToQuote } from './alpaca.ts';

const bar = (t: string, c: number) => ({ t, o: c, h: c + 1, l: c - 1, c, v: 1000 });

Deno.test('during a session, change is measured against the previous session close', () => {
  const quote = snapshotToQuote('AAPL', {
    latestTrade: { t: '2026-09-25T17:00:00Z', p: 110 },
    dailyBar: bar('2026-09-25T04:00:00Z', 109),
    prevDailyBar: bar('2026-09-24T04:00:00Z', 100),
  });
  assertEquals(quote?.previousClose, 100);
  assertEquals(quote?.change, 10);
  assertAlmostEquals(quote!.changePercent, 10);
  assertEquals(quote?.dayHigh, 110);
});

Deno.test('before the first trade of a new session, change is against the last daily close', () => {
  const quote = snapshotToQuote('AAPL', {
    latestTrade: { t: '2026-09-28T12:30:00Z', p: 105 },
    dailyBar: bar('2026-09-25T04:00:00Z', 100),
    prevDailyBar: bar('2026-09-24T04:00:00Z', 90),
  });
  assertEquals(quote?.previousClose, 100);
  assertEquals(quote?.change, 5);
  assertEquals(quote?.dayHigh, null);
});

Deno.test('snapshot without any price is dropped', () => {
  assertEquals(snapshotToQuote('ZZZZ', {}), null);
  assertEquals(
    snapshotsToQuotes({ ZZZZ: null, AAPL: { latestTrade: { t: '2026-09-25T17:00:00Z', p: 1 } } }),
    {
      AAPL: {
        symbol: 'AAPL',
        price: 1,
        change: 0,
        changePercent: 0,
        previousClose: null,
        dayHigh: null,
        dayLow: null,
        volume: null,
        updatedAt: '2026-09-25T17:00:00Z',
      },
    },
  );
});

Deno.test('snapshots wrapped in a "snapshots" key are accepted', () => {
  const quotes = snapshotsToQuotes({
    snapshots: { MSFT: { latestTrade: { t: '2026-09-25T17:00:00Z', p: 2 } } },
  });
  assertEquals(Object.keys(quotes), ['MSFT']);
});

Deno.test('1D keeps only regular-session bars from the latest session', () => {
  const points = barsToPoints('1D', [
    bar('2026-09-24T19:55:00Z', 1), // Thu 15:55 ET, previous session
    bar('2026-09-25T12:00:00Z', 2), // Fri 08:00 ET, pre-market
    bar('2026-09-25T13:30:00Z', 3), // Fri 09:30 ET, open
    bar('2026-09-25T19:55:00Z', 4), // Fri 15:55 ET
    bar('2026-09-25T20:00:00Z', 5), // Fri 16:00 ET, after hours
  ]);
  assertEquals(points.map((p) => p.c), [3, 4]);
  assertEquals(points[0].t, Date.parse('2026-09-25T13:30:00Z'));
});

Deno.test('daily ranges keep every bar', () => {
  const points = barsToPoints('1M', [
    bar('2026-09-24T04:00:00Z', 1),
    bar('2026-09-25T04:00:00Z', 2),
  ]);
  assertEquals(points.map((p) => p.c), [1, 2]);
});
