-- Daily devotion likes. Apply later with the Supabase CLI.
-- Do not run this from the app, and do not apply it from this change.
-- One like per signed-in player per America/Chicago devotion date.
-- The table stores the devotion id and the date. It does not store verse text.
-- Anyone can read the count through devotion_like_count. A player can insert or
-- delete only their own row. Other players' user ids are not readable.

create table public.devotion_likes (
  user_id uuid not null references auth.users (id) on delete cascade,
  devotion_id text not null check (char_length(devotion_id) between 1 and 80),
  devotion_date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, devotion_date)
);

create index devotion_likes_date_idx on public.devotion_likes (devotion_date);

comment on table public.devotion_likes is
  'One like per signed-in player per Chicago devotion date. Does not store verse text.';

alter table public.devotion_likes enable row level security;

create policy devotion_likes_select_own on public.devotion_likes
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy devotion_likes_insert_own on public.devotion_likes
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy devotion_likes_delete_own on public.devotion_likes
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.devotion_likes from anon, public;
grant select, insert, delete on public.devotion_likes to authenticated;

-- Returns a count only, so a signed-out player can read it without a policy
-- that exposes user ids. search_path is pinned. This follows the leaderboard
-- count functions already in public.
create or replace function public.devotion_like_count(for_date date)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.devotion_likes
  where devotion_date = for_date;
$$;

revoke all on function public.devotion_like_count(date) from public;
grant execute on function public.devotion_like_count(date) to anon, authenticated;
