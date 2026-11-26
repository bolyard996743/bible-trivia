-- Daily play log and a weekly leaderboard.
-- Apply later with the Supabase CLI. Do not run this from the app.
--
-- daily_plays stores one row per signed-in player per calendar day they played.
-- Row level security lets that player read, insert, update, and delete only
-- their own rows. Guests never write this table; their streak stays on the device.
-- The table has no point total, so a player cannot invent a score here.
--
-- question_awards gains awarded_at. New awards stamp the time they were earned.
-- Older rows stay null, so they remain on the all-time total and not on a week.
-- award_question_points is the writer. Players still cannot insert award rows.
--
-- leaderboard_weekly_top sums those new points for the week that contains now.
-- A week begins Monday 00:00 America/Los_Angeles and runs until the next Monday.
-- The comparison uses each row's own week start, so a daylight-saving shift
-- does not drop or double an hour. The function returns username, points, and
-- rank for the top 15 teen, adult, and older players. It does not return
-- user ids, email addresses, or birth dates.
-- leaderboard_top, the all-time board, is unchanged.

create table public.daily_plays (
  user_id uuid not null references auth.users (id) on delete cascade,
  played_on date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, played_on)
);

alter table public.daily_plays enable row level security;

create policy daily_plays_select_own on public.daily_plays
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy daily_plays_insert_own on public.daily_plays
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy daily_plays_update_own on public.daily_plays
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy daily_plays_delete_own on public.daily_plays
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.daily_plays from public, anon;
grant select, insert, update, delete on table public.daily_plays to authenticated;

alter table public.question_awards
  add column if not exists awarded_at timestamptz;

comment on column public.question_awards.awarded_at is
  'When these points were awarded. Null on earlier rows, which stay on the all-time total only.';

create or replace function public.award_question_points(
  question_id text,
  miss_count integer,
  season_id text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
  reported integer := greatest(coalesce(miss_count, 0), 0);
  stored integer;
  earned integer;
  total integer;
begin
  if uid is null then
    raise exception 'not signed in';
  end if;

  insert into public.question_progress (user_id, question_id, miss_count, mastered)
  values (uid, award_question_points.question_id, reported, false)
  on conflict (user_id, question_id) do update
    set miss_count = greatest(public.question_progress.miss_count, excluded.miss_count),
        updated_at = now();

  select qp.miss_count into stored
  from public.question_progress qp
  where qp.user_id = uid
    and qp.question_id = award_question_points.question_id;

  if coalesce(stored, reported) <= 0 then
    earned := 10;
  elsif stored = 1 then
    earned := 5;
  else
    earned := 2;
  end if;

  insert into public.question_awards (user_id, question_id, season_id, points, awarded_at)
  values (uid, award_question_points.question_id, award_question_points.season_id, earned, pg_catalog.statement_timestamp())
  on conflict (user_id, question_id, season_id) do nothing;
  if not found then
    select coalesce(sum(points), 0) into total from public.question_awards where user_id = uid;
    return total;
  end if;

  update public.profiles set points = points + earned where user_id = uid;
  select points into total from public.profiles where user_id = uid;
  return coalesce(total, earned);
end;
$$;

revoke all on function public.award_question_points(text, integer, text) from public, anon;
grant execute on function public.award_question_points(text, integer, text) to authenticated;

-- Monday is isodow 1. Subtract that many days, then read the local midnight
-- back as an absolute time in America/Los_Angeles.
create or replace function public.leaderboard_week_start(moment timestamptz)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select pg_catalog.timezone(
    'America/Los_Angeles',
    (
      (pg_catalog.timezone('America/Los_Angeles', moment))::date
      - (pg_catalog.date_part('isodow', pg_catalog.timezone('America/Los_Angeles', moment))::integer - 1)
    )::timestamp
  );
$$;

create or replace function public.leaderboard_weekly_top()
returns table(username text, points integer, rank bigint)
language sql
stable
security definer
set search_path = public
as $$
  with totals as (
    select p.username,
           sum(a.points)::integer as points
    from public.question_awards a
    join public.profiles p on p.user_id = a.user_id
    where a.awarded_at is not null
      and public.leaderboard_week_start(a.awarded_at) = public.leaderboard_week_start(pg_catalog.now())
      and p.username is not null
      and p.age_group in ('teen', 'adult', 'older')
    group by p.username
  ),
  ranked as (
    select t.username,
           t.points,
           row_number() over (order by t.points desc, t.username asc) as rank
    from totals t
  )
  select r.username, r.points, r.rank
  from ranked r
  where r.rank <= 15
  order by r.rank;
$$;

revoke all on function public.leaderboard_week_start(timestamptz) from public, anon, authenticated;
revoke all on function public.leaderboard_weekly_top() from public;
grant execute on function public.leaderboard_weekly_top() to anon, authenticated;
