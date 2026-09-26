import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, type Stock, type WatchlistItem } from '@/api';

export const WATCHLIST_KEY = ['watchlist'] as const;

export function useWatchlist() {
  return useQuery({ queryKey: WATCHLIST_KEY, queryFn: api.getWatchlist });
}

/** Optimistic add/remove; rolls back and refetches if the server call fails. */
export function useWatchlistMutations() {
  const queryClient = useQueryClient();

  const optimistic = async (update: (items: WatchlistItem[]) => WatchlistItem[]) => {
    await queryClient.cancelQueries({ queryKey: WATCHLIST_KEY });
    const previous = queryClient.getQueryData<WatchlistItem[]>(WATCHLIST_KEY);
    if (previous) queryClient.setQueryData(WATCHLIST_KEY, update(previous));
    return { previous };
  };

  const rollback = (_error: unknown, _vars: unknown, context?: { previous?: WatchlistItem[] }) => {
    if (context?.previous) queryClient.setQueryData(WATCHLIST_KEY, context.previous);
  };

  const settle = () => queryClient.invalidateQueries({ queryKey: WATCHLIST_KEY });

  const add = useMutation({
    mutationFn: (stock: Stock) => api.addToWatchlist(stock.symbol),
    onMutate: (stock) =>
      optimistic((items) =>
        items.some((item) => item.stock.symbol === stock.symbol)
          ? items
          : [{ stock, addedAt: new Date().toISOString() }, ...items],
      ),
    onError: rollback,
    onSettled: settle,
  });

  const remove = useMutation({
    mutationFn: (symbol: string) => api.removeFromWatchlist(symbol),
    onMutate: (symbol) => optimistic((items) => items.filter((i) => i.stock.symbol !== symbol)),
    onError: rollback,
    onSettled: settle,
  });

  return { add, remove };
}
