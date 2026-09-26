import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';

import { api, type ChartRange } from '@/api';

/** How often visible prices refresh. The market function caches quotes for 4s. */
export const QUOTE_POLL_MS = 5_000;

/**
 * Live quotes for a set of symbols, polled while the screen is focused and the
 * app is in the foreground.
 */
export function useQuotes(symbols: string[], pollMs = QUOTE_POLL_MS) {
  const isFocused = useIsFocused();
  const key = [...symbols].sort();
  return useQuery({
    queryKey: ['quotes', key],
    queryFn: () => api.getQuotes(key),
    enabled: key.length > 0,
    refetchInterval: isFocused ? pollMs : false,
    staleTime: pollMs,
    // Keep showing the last prices while a new symbol set loads.
    placeholderData: keepPreviousData,
  });
}

export function useChart(symbol: string, range: ChartRange, enabled = true) {
  const isFocused = useIsFocused();
  const intraday = range === '1D';
  return useQuery({
    queryKey: ['chart', symbol, range],
    queryFn: () => api.getChart(symbol, range),
    enabled,
    staleTime: intraday ? 60_000 : 10 * 60_000,
    refetchInterval: intraday && isFocused ? 60_000 : false,
  });
}

export function useStock(symbol: string) {
  return useQuery({
    queryKey: ['stock', symbol],
    queryFn: () => api.getStock(symbol),
    staleTime: 10 * 60_000,
  });
}
