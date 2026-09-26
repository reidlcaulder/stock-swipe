# StockSwipe

Tinder for stocks. Swipe right to add a stock to your watchlist, left to pass. Cards show a live price, a chart, and key stats.

- **App:** Expo (React Native) for iOS and Android. It also runs on web for development.
- **Backend:** Supabase: email-code sign-in, Postgres for watchlists and swipe history, and Edge Functions.
- **Live prices and charts:** Alpaca Market Data. The free plan provides real-time data from one exchange (IEX).
- **Company profiles and fundamentals:** Finnhub, refreshed into Postgres on a schedule.

## Quick start (demo mode)

No accounts or keys needed. The app runs on bundled mock data.

```bash
npm install
npm start          # then press i (iOS simulator), a (Android), or w (web), or scan the QR code with Expo Go
```

Demo mode is on whenever `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is missing, or when `EXPO_PUBLIC_USE_MOCKS=true`. Any 6-digit code signs you in.

## Checks

```bash
npm run check            # typecheck + lint + Jest
npm run functions:check  # deno check + lint for supabase/functions
npm run functions:test   # deno tests for supabase/functions
```

## Backend setup

You need a Supabase project, a free [Alpaca](https://alpaca.markets) account (paper trading keys work for market data), and a free [Finnhub](https://finnhub.io) API key.

1. **Link the project and apply the schema.** This adds the tables, row-level security, a seed list of about 215 stocks, and the refresh schedule.
   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   npx supabase config push   # sign-in code email template + OTP settings from supabase/config.toml
   ```
2. **Set the function secrets.**
   ```bash
   npx supabase secrets set \
     ALPACA_KEY_ID=... ALPACA_SECRET_KEY=... \
     FINNHUB_API_KEY=... \
     REFRESH_STOCKS_SECRET=$(openssl rand -hex 32)
   ```
   Optional: `ALPACA_FEED=sip` once you pay for Alpaca's full-market data (the default is `iex`).
3. **Deploy the functions.**
   ```bash
   npx supabase functions deploy market
   npx supabase functions deploy refresh-stocks
   ```
4. **Let the scheduled refresh call the function.** Run this in the SQL editor, using the same secret value as `REFRESH_STOCKS_SECRET`:
   ```sql
   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
   select vault.create_secret('<REFRESH_STOCKS_SECRET>', 'refresh_stocks_secret');
   ```
   Every 10 minutes, `pg_cron` refreshes a batch of 20 stock profiles, so the whole list fills in within about two hours. Check runs with `select * from cron.job_run_details order by start_time desc;`.
5. **Point the app at the project.** Copy `.env.example` to `.env.local` and fill in the project URL and publishable key.

For production email volume, configure custom SMTP (Authentication → Emails). Supabase's built-in sender is heavily rate-limited.

## Running on a phone

Every native module the app uses ships with Expo Go, so `npm start` plus the Expo Go app is enough for development. For store builds, use EAS: `npx eas-cli@latest build`.

## Market data notes

- On Alpaca's free plan, prices come from IEX, which is a single exchange. They track the consolidated price closely for liquid stocks. Set `ALPACA_FEED=sip` after upgrading to get every exchange.
- Showing exchange data to the public generally requires a redistribution license from the data provider. Sort this out before a public launch.
