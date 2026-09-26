-- Call the refresh-stocks Edge Function every 10 minutes. Each run refreshes a
-- small batch of the stalest profiles (Finnhub's free tier allows 60 calls/min),
-- so the whole universe cycles roughly once a day.
--
-- Requires two Vault secrets (see README "Backend setup"):
--   project_url            https://<project-ref>.supabase.co
--   refresh_stocks_secret  same value as the REFRESH_STOCKS_SECRET function secret
-- Until they exist the job runs but its HTTP call fails harmlessly
-- (visible in cron.job_run_details).

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'refresh-stocks',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/refresh-stocks',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-refresh-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'refresh_stocks_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000
  );
  $$
);
