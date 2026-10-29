-- Usernames, points, and public leaderboard reads.
-- Apply later with the Supabase CLI. Do not run this from the app.
-- Kids are not stored here. A child only calls leaderboard_around_score with a point total.

alter table public.profiles add column username text;
alter table public.profiles add column points integer not null default 0 check (points >= 0);
alter table public.profiles add column birth_date date;

create or replace function public.age_group_from_birth_date(birth date)
returns text
language plpgsql
stable
as $$
declare
  years integer;
begin
  years := date_part('year', age(current_date, birth))::integer;
  if years < 13 then
    return 'child';
  elsif years < 18 then
    return 'teen';
  elsif years < 65 then
    return 'adult';
  else
    return 'older';
  end if;
end;
$$;

create or replace function public.apply_birth_date()
returns trigger
language plpgsql
as $$
declare
  group_name text;
begin
  if new.birth_date is null then
    return new;
  end if;
  group_name := public.age_group_from_birth_date(new.birth_date);
  if group_name = 'child' then
    raise exception 'birth date is under 13';
  end if;
  new.age_group := group_name;
  return new;
end;
$$;

create trigger profiles_sync_age_group
  before insert or update on public.profiles
  for each row
  execute function public.apply_birth_date();

create or replace function public.username_is_allowed(candidate text)
returns boolean
language plpgsql
immutable
as $$
declare
  lowered text := lower(candidate);
  part text;
  blocked text[] := array[
    'admin', 'asshole', 'bitch', 'cock', 'cunt', 'dick', 'faggot', 'fuck',
    'moderator', 'nazi', 'nigga', 'nigger', 'porn', 'pussy', 'shit', 'slut', 'support'
  ];
begin
  if candidate is null or candidate !~ '^[A-Za-z0-9_]{3,20}$' then
    return false;
  end if;
  if position('@' in candidate) > 0 then
    return false;
  end if;
  if candidate ~* 'https?://' or candidate ~* 'www\.' then
    return false;
  end if;
  if length(regexp_replace(candidate, '\D', '', 'g')) >= 7 then
    return false;
  end if;
  foreach part in array blocked loop
    if position(part in lowered) > 0 then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

alter table public.profiles
  add constraint profiles_username_allowed
  check (username is null or public.username_is_allowed(username));

create unique index profiles_username_lower on public.profiles (lower(username));

create or replace function public.prevent_username_change()
returns trigger
language plpgsql
as $$
begin
  if old.username is not null and new.username is distinct from old.username then
    raise exception 'username cannot be changed';
  end if;
  return new;
end;
$$;

create trigger profiles_username_permanent
  before update on public.profiles
  for each row
  execute function public.prevent_username_change();

create or replace function public.username_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.username_is_allowed(candidate)
    and not exists (
      select 1 from public.profiles where lower(username) = lower(candidate)
    );
$$;

-- Recreate row policies with the (select auth.uid()) form.
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_delete_own on public.profiles;
drop policy if exists question_progress_select_own on public.question_progress;
drop policy if exists question_progress_insert_own on public.question_progress;
drop policy if exists question_progress_update_own on public.question_progress;
drop policy if exists question_progress_delete_own on public.question_progress;
drop policy if exists verse_marks_select_own on public.verse_marks;
drop policy if exists verse_marks_insert_own on public.verse_marks;
drop policy if exists verse_marks_update_own on public.verse_marks;
drop policy if exists verse_marks_delete_own on public.verse_marks;

create policy profiles_select_own on public.profiles
  for select using ((select auth.uid()) = user_id);
create policy profiles_insert_own on public.profiles
  for insert with check ((select auth.uid()) = user_id);
create policy profiles_update_own on public.profiles
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy profiles_delete_own on public.profiles
  for delete using ((select auth.uid()) = user_id);

create policy question_progress_select_own on public.question_progress
  for select using ((select auth.uid()) = user_id);
create policy question_progress_insert_own on public.question_progress
  for insert with check ((select auth.uid()) = user_id);
create policy question_progress_update_own on public.question_progress
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy question_progress_delete_own on public.question_progress
  for delete using ((select auth.uid()) = user_id);

create policy verse_marks_select_own on public.verse_marks
  for select using ((select auth.uid()) = user_id);
create policy verse_marks_insert_own on public.verse_marks
  for insert with check ((select auth.uid()) = user_id);
create policy verse_marks_update_own on public.verse_marks
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy verse_marks_delete_own on public.verse_marks
  for delete using ((select auth.uid()) = user_id);

create or replace function public.leaderboard_ranked()
returns table(username text, points integer, rank bigint)
language sql
stable
security definer
set search_path = public
as $$
  select p.username, p.points,
         row_number() over (order by p.points desc, p.username asc) as rank
  from public.profiles p
  where p.username is not null
    and p.age_group in ('teen', 'adult', 'older');
$$;

create or replace function public.leaderboard_top()
returns table(username text, points integer, rank bigint)
language sql
stable
security definer
set search_path = public
as $$
  select r.username, r.points, r.rank
  from public.leaderboard_ranked() r
  where r.rank <= 15
  order by r.rank;
$$;

create or replace function public.leaderboard_near()
returns table(username text, points integer, rank bigint)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select r.rank
    from public.leaderboard_ranked() r
    join public.profiles p on lower(p.username) = lower(r.username)
    where p.user_id = (select auth.uid())
  )
  select r.username, r.points, r.rank
  from public.leaderboard_ranked() r
  cross join me
  where r.rank between greatest(1, me.rank - 10) and me.rank + 4
  order by r.rank;
$$;

-- Read-only window around a score. The only argument is an integer.
create or replace function public.leaderboard_around_score(score integer)
returns table(username text, points integer)
language sql
stable
security definer
set search_path = public
as $$
  with ranked as (
    select r.username, r.points, r.rank
    from public.leaderboard_ranked() r
  ),
  anchor as (
    select r.rank
    from ranked r
    order by abs(r.points - greatest(score, 0)), r.rank
    limit 1
  )
  select r.username, r.points
  from ranked r
  cross join anchor a
  where r.rank between greatest(1, a.rank - 7) and a.rank + 7
  order by r.rank;
$$;

revoke all on function public.username_available(text) from public;
revoke all on function public.leaderboard_ranked() from public;
revoke all on function public.leaderboard_top() from public;
revoke all on function public.leaderboard_near() from public;
revoke all on function public.leaderboard_around_score(integer) from public;

grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.leaderboard_top() to authenticated;
grant execute on function public.leaderboard_near() to authenticated;
grant execute on function public.leaderboard_around_score(integer) to anon, authenticated;
