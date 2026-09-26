-- Core schema: the stock universe, per-user swipe history, and per-user watchlists.

-- ---------------------------------------------------------------------------
-- stocks: the deck universe. Profile/fundamental columns are filled in by the
-- refresh-stocks Edge Function (Finnhub). Live prices are never stored here;
-- the app fetches them through the market Edge Function (Alpaca).
-- ---------------------------------------------------------------------------
create table public.stocks (
  symbol text primary key check (symbol ~ '^[A-Z][A-Z0-9.\-]{0,9}$'),
  name text not null,
  exchange text,
  industry text,
  logo_url text,
  website text,
  market_cap numeric,          -- USD
  shares_outstanding numeric,  -- shares
  pe_ratio numeric,            -- trailing twelve months
  week52_high numeric,
  week52_low numeric,
  beta numeric,
  dividend_yield numeric,      -- percent, e.g. 0.45 means 0.45%
  is_active boolean not null default true,
  profile_updated_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.stocks is 'Deck universe. Written only by the refresh-stocks Edge Function (secret key); read-only for signed-in users.';

create index stocks_refresh_queue_idx on public.stocks (profile_updated_at nulls first) where is_active;

alter table public.stocks enable row level security;

create policy "Signed-in users can read stocks"
  on public.stocks for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- swipes: one row per (user, symbol) holding the latest decision. Anything
-- swiped is excluded from that user's deck.
-- ---------------------------------------------------------------------------
create table public.swipes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  symbol text not null references public.stocks (symbol) on delete cascade,
  direction text not null check (direction in ('left', 'right')),
  swiped_at timestamptz not null default now(),
  primary key (user_id, symbol)
);

create index swipes_symbol_idx on public.swipes (symbol);

alter table public.swipes enable row level security;

create policy "Users can read their own swipes"
  on public.swipes for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their own swipes"
  on public.swipes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own swipes"
  on public.swipes for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own swipes"
  on public.swipes for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- watchlist: stocks a user swiped right on (or added from the detail screen).
-- ---------------------------------------------------------------------------
create table public.watchlist (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  symbol text not null references public.stocks (symbol) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (user_id, symbol)
);

create index watchlist_symbol_idx on public.watchlist (symbol);

alter table public.watchlist enable row level security;

create policy "Users can read their own watchlist"
  on public.watchlist for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add to their own watchlist"
  on public.watchlist for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can remove from their own watchlist"
  on public.watchlist for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- RPCs. Both run as the caller (security invoker) so RLS still applies.
-- ---------------------------------------------------------------------------

-- Random batch of active stocks the caller hasn't swiped yet.
-- p_exclude lets the client skip cards it already holds or just swiped
-- (record_swipe calls may still be in flight).
create function public.get_deck(p_limit integer default 20, p_exclude text[] default '{}')
returns setof public.stocks
language sql
stable
security invoker
set search_path = ''
as $$
  select s.*
  from public.stocks s
  where s.is_active
    and not (s.symbol = any (coalesce(p_exclude, '{}')))
    and not exists (
      select 1
      from public.swipes w
      where w.user_id = (select auth.uid())
        and w.symbol = s.symbol
    )
  order by random()
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

-- Records the caller's latest decision on a symbol; a right swipe also adds it
-- to the watchlist. Removing from the watchlist is a plain delete.
create function public.record_swipe(p_symbol text, p_direction text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_direction not in ('left', 'right') then
    raise exception 'direction must be left or right, got %', p_direction
      using errcode = '22023';
  end if;

  insert into public.swipes (user_id, symbol, direction)
  values ((select auth.uid()), p_symbol, p_direction)
  on conflict (user_id, symbol)
  do update set direction = excluded.direction, swiped_at = now();

  if p_direction = 'right' then
    insert into public.watchlist (user_id, symbol)
    values ((select auth.uid()), p_symbol)
    on conflict do nothing;
  end if;
end;
$$;

revoke execute on function public.get_deck(integer, text[]) from public, anon;
revoke execute on function public.record_swipe(text, text) from public, anon;
grant execute on function public.get_deck(integer, text[]) to authenticated;
grant execute on function public.record_swipe(text, text) to authenticated;
