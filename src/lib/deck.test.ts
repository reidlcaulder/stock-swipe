import type { Stock } from '@/api/types';
import { deckExclusions, mergeDeckBatch } from '@/lib/deck';

const stock = (symbol: string): Stock => ({
  symbol,
  name: symbol,
  exchange: null,
  industry: null,
  logoUrl: null,
  website: null,
  marketCap: null,
  peRatio: null,
  week52High: null,
  week52Low: null,
  beta: null,
  dividendYield: null,
});

describe('deckExclusions', () => {
  it('combines queued and swiped symbols without duplicates', () => {
    expect(deckExclusions([stock('A'), stock('B')], new Set(['B', 'C']))).toEqual(['A', 'B', 'C']);
  });
});

describe('mergeDeckBatch', () => {
  it('appends new stocks and skips queued, swiped, and repeated ones', () => {
    const queue = [stock('A')];
    const merged = mergeDeckBatch(queue, [stock('A'), stock('B'), stock('C'), stock('B')], new Set(['C']));
    expect(merged.map((s) => s.symbol)).toEqual(['A', 'B']);
  });

  it('returns the same array when nothing is added', () => {
    const queue = [stock('A')];
    expect(mergeDeckBatch(queue, [stock('A')], new Set())).toBe(queue);
  });
});
