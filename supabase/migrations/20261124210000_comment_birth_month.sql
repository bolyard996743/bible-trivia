-- Comment age uses a private birth month and year. Apply later.
-- Do not run this from the app, and do not apply it from this change.
-- A player may set the month and year only while they are empty.
-- After that, only the service role (auth.uid() is null) can correct them.
-- The columns are not returned by leaderboard or comment reads.

alter table public.profiles
  add column if not exists comment_birth_year integer,
  add column if not exists comment_birth_month integer;

alter table public.profiles
  drop constraint if exists profiles_comment_birth_month_check;

alter table public.profiles
  add constraint profiles_comment_birth_month_check
  check (
    (comment_birth_year is null and comment_birth_month is null)
    or (
      comment_birth_year between 1900 and 2200
      and comment_birth_month between 1 and 12
    )
  );

comment on column public.profiles.comment_birth_year is
  'Private birth year for the comment age check. Not shown publicly.';
comment on column public.profiles.comment_birth_month is
  'Private birth month for the comment age check. Not shown publicly.';

-- 13+ only after the birth month has fully passed.
-- March 2013 opens on 1 April 2026. December 2013 opens on 1 January 2027.
create or replace function public.comment_age_reached(birth_year integer, birth_month integer)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  today date := (now() at time zone 'America/Chicago')::date;
  open_date date;
begin
  if birth_year is null or birth_month is null or birth_month < 1 or birth_month > 12 then
    return false;
  end if;
  open_date := (pg_catalog.make_date(birth_year, birth_month, 1) + interval '13 years' + interval '1 month')::date;
  return today >= open_date;
end;
$$;

create or replace function public.devotion_comment_may_write()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
  birth date;
  saved_year integer;
  saved_month integer;
begin
  if uid is null then
    return false;
  end if;
  select birth_date, comment_birth_year, comment_birth_month
    into birth, saved_year, saved_month
  from public.profiles
  where user_id = uid;
  if not found then
    return false;
  end if;
  if exists (select 1 from public.devotion_comment_bans where user_id = uid) then
    return false;
  end if;
  if saved_year is not null and saved_month is not null then
    return public.comment_age_reached(saved_year, saved_month);
  end if;
  if birth is null then
    return false;
  end if;
  return public.comment_age_reached(
    pg_catalog.extract(year from birth)::integer,
    pg_catalog.extract(month from birth)::integer
  );
end;
$$;

create or replace function public.lock_profile_birth()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  if (select auth.uid()) is distinct from new.user_id then
    raise exception 'birth date is locked';
  end if;
  if old.birth_date is not null and new.birth_date is distinct from old.birth_date then
    raise exception 'birth date is locked';
  end if;
  if old.comment_birth_year is not null and (
    new.comment_birth_year is distinct from old.comment_birth_year
    or new.comment_birth_month is distinct from old.comment_birth_month
  ) then
    raise exception 'birth date is locked';
  end if;
  if old.birth_date is not null and old.comment_birth_year is null and new.comment_birth_year is not null then
    raise exception 'birth date is locked';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_lock_birth on public.profiles;
create trigger profiles_lock_birth
  before update on public.profiles
  for each row
  execute function public.lock_profile_birth();

revoke all on function public.comment_age_reached(integer, integer) from public;
revoke all on function public.lock_profile_birth() from public;
grant execute on function public.devotion_comment_may_write() to authenticated;
