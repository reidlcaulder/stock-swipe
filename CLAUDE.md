# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

StockSwipe is a Tinder-style stock discovery mobile app: swipe right to add a stock to your watchlist, left to pass. The stack:

- **App:** Expo SDK 57 (React Native 0.86, React 19.2, React Compiler and typed routes enabled), Expo Router, TanStack Query, Reanimated 4, and Gesture Handler.
- **Backend:** Supabase (email-code sign-in, Postgres with RLS, Deno Edge Functions).
- **Data providers:** Alpaca supplies live quotes and chart bars; Finnhub supplies company profiles and fundamentals.

This repo was rebuilt from scratch in September 2026. The earlier Google AI Studio (Vite + Express + Firebase) version exists only in git history.

## Commands

```bash
npm start                      # Expo dev server (i / a / w, or Expo Go)
npm run check                  # tsc + expo lint + jest: run before calling any change done
npx jest src/lib/format.test.ts       # one test file
npx jest -t "signs positive"          # tests matching a name
npm run functions:check        # deno check + deno lint for supabase/functions
npm run functions:test         # deno tests for supabase/functions
npx deno test --config supabase/functions/deno.json supabase/functions/_shared/alpaca.test.ts  # one Deno test file
npx expo install <pkg>         # always use this, not npm install, to get SDK-compatible versions
EXPO_PUBLIC_USE_MOCKS=true npx expo export --platform web   # static web build (e.g. for Playwright screenshots)
```

Deno comes from the `deno` devDependency, so there's nothing to install globally.

## Architecture

### Data flow

- The app never calls Alpaca or Finnhub directly. Provider keys exist only as Edge Function secrets.
  - **Live prices and charts:** `supabase.functions.invoke('market', { body: { action: 'quotes' | 'chart', ... } })` calls `supabase/functions/market`, which calls Alpaca. Responses get a small per-isolate TTL cache (4s for quotes). Prices are never stored in Postgres.
  - **Profiles and fundamentals:** a `pg_cron` job (migration `..._schedule_refresh_stocks.sql`) POSTs to `supabase/functions/refresh-stocks` every 10 minutes. The function pulls a batch of stale rows from Finnhub (free tier: 60 calls/min) into `public.stocks` and sets `is_active = false` for symbols Finnhub doesn't know.
  - **Deck and swipes:** the app calls two RPCs. `get_deck(p_limit, p_exclude)` returns a random batch that excludes the user's swipes. `record_swipe(p_symbol, p_direction)` upserts the swipe, and a right swipe also inserts into `watchlist`. Both are `security invoker`, so RLS still applies.
- **Two interchangeable backends.** `src/api/types.ts` defines the `Api` interface, implemented by `supabase-api.ts` and `mock-api.ts`. `src/api/index.ts` picks one via `config.useMocks`. Sign-in follows the same pattern in `src/auth/auth-backend.ts`. Screens use `api` and `useAuth()`, never the Supabase client directly. A new backend call needs both implementations.
- **Demo mode** (`src/lib/config.ts`) turns on automatically when `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is missing, so a fresh clone runs on mock data. In demo mode any 6-digit code signs in.
- **Types duplicated across the Deno/app boundary, kept in sync by hand:**
  - `Quote`, `ChartPoint`, `MarketStatus`, and `ChartRange` in `src/api/types.ts` mirror `supabase/functions/_shared/alpaca.ts`.
  - `Stock` mirrors the `public.stocks` columns via `toStock()` in `supabase-api.ts`.
  - Refresh columns map through `toStockProfile()` in `_shared/finnhub.ts`.

### App structure

- **Routes** live in `src/app` (Expo Router; every file there is a route, so tests and helpers go elsewhere). The root `_layout.tsx` sets up the providers (`GestureHandlerRootView` → `QueryClientProvider` → `AuthProvider`) and uses `Stack.Protected` guards to switch between `sign-in` and the signed-in screens (`(tabs)` and `stock/[symbol]`).
- **The swipe queue** lives in `DeckProvider` (`src/hooks/deck-provider.tsx`), mounted in `(tabs)/_layout.tsx`, so it survives tab switches and the Account screen can reset passes. It refills below 5 cards and excludes symbols swiped this session, because their `record_swipe` calls may still be in flight. Pure helpers live in `src/lib/deck.ts`.
- **Server state** uses TanStack Query with the keys `['quotes', sortedSymbols]`, `['chart', symbol, range]`, `['stock', symbol]`, and `['watchlist']`. Polling uses `refetchInterval`, gated by `useIsFocused()` and by AppState via `focusManager` (`src/lib/query-client.ts`). Watchlist changes are optimistic (`src/hooks/use-watchlist.ts`).
- **`SwipeDeck`** (`src/components/swipe-deck.tsx`) is generic. It renders the top 3 cards, and every stack position uses the same `DeckCard` component keyed by item, so a card keeps its state when it moves to the top. A shared `progress` value drives the cards behind it. `onSwiped` fires after the fling animation (via `scheduleOnRN`), and the buttons call the imperative `swipe()` through a ref.
- **Charts** are hand-rolled SVG. `src/lib/chart.ts` builds the paths, with x spaced by index so market-closed gaps don't show.

### Database

- Migrations live in `supabase/migrations` and are applied with `npx supabase db push`. New tables need RLS policies written with `(select auth.uid())`. New functions need `security invoker`, `set search_path = ''`, and execute revoked from `anon`.
- `public.stocks` is written only by `refresh-stocks` using the secret key. Signed-in users have read-only access.
- To add stocks to the universe, insert `(symbol, name)` rows and the refresh job fills in the rest.
- `supabase/config.toml` holds the non-default settings: the OTP email template (`supabase/templates/magic_link.html` must contain `{{ .Token }}` for code sign-in) and `verify_jwt = false` for `refresh-stocks`, which authenticates with the `x-refresh-secret` header instead.

## Conventions and gotchas

- **Expo APIs change every SDK.** Check the installed package's types in `node_modules` or the versioned docs at `https://docs.expo.dev/versions/v57.0.0/` before using an Expo or React Native API. For example, JS tabs now come from `expo-router/js-tabs`; the `Tabs` export from `expo-router` is deprecated.
- **Native folders:** never create or edit `ios/` or `android/` (Continuous Native Generation). Configure native behavior in `app.json`.
- **React Compiler is on:** use Reanimated's `.get()` / `.set()` instead of `.value`, and don't read refs during render.
- **Env vars:** read `EXPO_PUBLIC_*` as literal `process.env.EXPO_PUBLIC_X`, since they're inlined at build time.
- **Formatting:** `src/lib/format.ts` avoids `Intl` on purpose, because Hermes's Intl support differs between iOS and Android.
- **Icons:** use `<Icon name=…>` (`src/components/icon.tsx`), which wraps expo-symbols with an SF Symbol name plus a Material Symbol name. Check new names against `node_modules/expo-symbols/build/android/symbols.json` and `sf-symbols-typescript`.
- **Styling:** the app is dark-only. Use the tokens in `src/theme.ts` with `StyleSheet`.
- **TypeScript 6** no longer auto-includes `@types/*`, so `tsconfig.json` lists `types: ["jest"]`.
- **`supabase/` is Deno code**, excluded from tsconfig, ESLint, and Jest. It uses inline `npm:` / `jsr:` imports (`no-import-prefix` is disabled in `supabase/functions/deno.json`).

## Testing without the real backend

- **The app:** demo mode exercises every screen. A web export plus Playwright works for end-to-end checks and screenshots.
- **Migrations:** a plain Postgres works if you first create stand-ins for Supabase's `anon`, `authenticated`, and `service_role` roles, an `auth.users` table, and an `auth.uid()` that reads `request.jwt.claims`. Skip the pg_cron migration.
- **Edge Functions:** `deno run -A supabase/functions/market/index.ts` serves on :8000. Point `ALPACA_DATA_URL` and `ALPACA_TRADING_URL` at a fake server to test without Alpaca.
