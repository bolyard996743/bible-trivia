-- Curriculum ladder progress and server-side season points.
-- Apply later. This repo does not run migrations.
-- Existing profiles.points were tier-weight test totals. Attempt scores cannot be
-- rebuilt from those totals, so they are reset to 0. New points come only from
-- award_question_points.

alter table public.question_progress add column if not exists first_try_correct boolean;
alter table public.question_progress add column if not exists season_id text;
alter table public.question_progress add column if not exists stage text;

update public.profiles set points = 0 where true;

create table if not exists public.stage_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  stage text not null,
  kind text not null check (kind in ('topic', 'book')),
  item_key text not null,
  cleared_at timestamptz,
  question_id text,
  primary key (user_id, stage, kind, item_key)
);

alter table public.stage_progress enable row level security;

create policy stage_progress_select_own on public.stage_progress
  for select using ((select auth.uid()) = user_id);
create policy stage_progress_insert_own on public.stage_progress
  for insert with check ((select auth.uid()) = user_id);
create policy stage_progress_update_own on public.stage_progress
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy stage_progress_delete_own on public.stage_progress
  for delete using ((select auth.uid()) = user_id);

create table if not exists public.question_awards (
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id text not null,
  season_id text not null,
  points integer not null check (points >= 0),
  primary key (user_id, question_id, season_id)
);

alter table public.question_awards enable row level security;

create policy question_awards_select_own on public.question_awards
  for select using ((select auth.uid()) = user_id);

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
  earned integer;
  total integer;
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  if miss_count <= 0 then
    earned := 10;
  elsif miss_count = 1 then
    earned := 5;
  else
    earned := 2;
  end if;
  insert into public.question_awards (user_id, question_id, season_id, points)
  values (uid, question_id, season_id, earned)
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
