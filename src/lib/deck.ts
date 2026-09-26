import type { Stock } from '@/api/types';

/** Fetch another batch when the queue drops below this many cards. */
export const DECK_REFILL_THRESHOLD = 5;
export const DECK_BATCH_SIZE = 20;

/**
 * Symbols the server should skip: cards already queued plus everything swiped
 * this session (their record_swipe calls may not have landed yet).
 */
export function deckExclusions(queue: Stock[], swiped: ReadonlySet<string>): string[] {
  return [...new Set([...queue.map((s) => s.symbol), ...swiped])];
}

/** Appends a fetched batch, dropping duplicates and anything already swiped. */
export function mergeDeckBatch(
  queue: Stock[],
  batch: Stock[],
  swiped: ReadonlySet<string>,
): Stock[] {
  const seen = new Set(queue.map((s) => s.symbol));
  const additions = batch.filter((stock) => {
    if (seen.has(stock.symbol) || swiped.has(stock.symbol)) return false;
    seen.add(stock.symbol);
    return true;
  });
  return additions.length > 0 ? [...queue, ...additions] : queue;
}
