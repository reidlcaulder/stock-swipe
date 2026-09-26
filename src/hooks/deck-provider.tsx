import { useQueryClient } from '@tanstack/react-query';
import { createContext, type ReactNode, use, useEffect, useRef, useState } from 'react';

import { api, type Stock, type SwipeDirection, type WatchlistItem } from '@/api';
import { WATCHLIST_KEY } from '@/hooks/use-watchlist';
import { DECK_BATCH_SIZE, DECK_REFILL_THRESHOLD, deckExclusions, mergeDeckBatch } from '@/lib/deck';

type DeckStatus = 'loading' | 'ready' | 'empty' | 'error';

interface DeckContextValue {
  /** Queue of upcoming cards; cards[0] is the one on top. */
  cards: Stock[];
  status: DeckStatus;
  error: string | null;
  /** Transient message, e.g. a swipe that failed to save. */
  notice: string | null;
  swipe(stock: Stock, direction: SwipeDirection): void;
  retry(): void;
  dismissNotice(): void;
  /** Makes passed stocks eligible again and refills the deck. */
  resetPasses(): Promise<void>;
}

const DeckContext = createContext<DeckContextValue | null>(null);

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong';

/**
 * Owns the swipe queue. Lives above the tabs so the Account screen can reset
 * passes and the deck survives tab switches.
 */
export function DeckProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [cards, setCards] = useState<Stock[]>([]);
  const [fetching, setFetching] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const swiped = useRef(new Set<string>());
  const inFlight = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Refill whenever the queue runs low. Swipes during a fetch are fine: the
  // result is merged into whatever the queue is by then.
  useEffect(() => {
    if (inFlight.current || exhausted || error || cards.length >= DECK_REFILL_THRESHOLD) return;
    inFlight.current = true;
    setFetching(true);
    const exclude = deckExclusions(cards, swiped.current);
    api
      .getDeck(DECK_BATCH_SIZE, exclude)
      .then((batch) => {
        if (!mounted.current) return;
        const fresh = batch.filter((stock) => !exclude.includes(stock.symbol));
        if (fresh.length === 0) setExhausted(true);
        setCards((queue) => mergeDeckBatch(queue, fresh, swiped.current));
      })
      .catch((e: unknown) => {
        if (mounted.current) setError(messageOf(e));
      })
      .finally(() => {
        inFlight.current = false;
        if (mounted.current) setFetching(false);
      });
  }, [cards, exhausted, error, fetching]);

  const swipe = (stock: Stock, direction: SwipeDirection) => {
    swiped.current.add(stock.symbol);
    setCards((queue) => queue.filter((s) => s.symbol !== stock.symbol));

    if (direction === 'right') {
      queryClient.setQueryData<WatchlistItem[]>(WATCHLIST_KEY, (items) =>
        items && !items.some((item) => item.stock.symbol === stock.symbol)
          ? [{ stock, addedAt: new Date().toISOString() }, ...items]
          : items,
      );
    }

    api
      .recordSwipe(stock.symbol, direction)
      .catch(() => {
        setNotice(
          direction === 'right'
            ? `Couldn't add ${stock.symbol} to your watchlist`
            : `Couldn't save your pass on ${stock.symbol}`,
        );
      })
      .finally(() => {
        if (direction === 'right') queryClient.invalidateQueries({ queryKey: WATCHLIST_KEY });
      });
  };

  const resetPasses = async () => {
    await api.resetPasses();
    swiped.current = new Set();
    setError(null);
    setExhausted(false);
  };

  const status: DeckStatus =
    cards.length > 0 ? 'ready' : error ? 'error' : exhausted ? 'empty' : 'loading';

  const value: DeckContextValue = {
    cards,
    status,
    error,
    notice,
    swipe,
    retry: () => setError(null),
    dismissNotice: () => setNotice(null),
    resetPasses,
  };

  return <DeckContext value={value}>{children}</DeckContext>;
}

export function useDeck(): DeckContextValue {
  const context = use(DeckContext);
  if (!context) throw new Error('useDeck must be used inside <DeckProvider>');
  return context;
}
