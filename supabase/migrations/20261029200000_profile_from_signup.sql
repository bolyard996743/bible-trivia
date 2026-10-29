-- Create the profile when Auth inserts a user, including when email confirmation
-- means the browser has no session yet. Apply later with the Supabase CLI.
-- This repo does not apply migrations.

create or replace function public.age_group_from_birth_date(birth date)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  years integer;
begin
  years := pg_catalog.date_part('year', pg_catalog.age(current_date, birth))::integer;
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
set search_path = ''
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

create or replace function public.username_is_allowed(candidate text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  lowered text := pg_catalog.lower(candidate);
  part text;
  blocked text[] := array[
    'admin', 'asshole', 'bitch', 'cock', 'cunt', 'dick', 'faggot', 'fuck',
    'moderator', 'nazi', 'nigga', 'nigger', 'porn', 'pussy', 'shit', 'slut', 'support'
  ];
begin
  if candidate is null or candidate !~ '^[A-Za-z0-9_]{3,20}$' then
    return false;
  end if;
  if pg_catalog.position('@' in candidate) > 0 then
    return false;
  end if;
  if candidate ~* 'https?://' or candidate ~* 'www\.' then
    return false;
  end if;
  if pg_catalog.length(pg_catalog.regexp_replace(candidate, '\D', '', 'g')) >= 7 then
    return false;
  end if;
  foreach part in array blocked loop
    if pg_catalog.position(part in lowered) > 0 then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

create or replace function public.prevent_username_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.username is not null and new.username is distinct from old.username then
    raise exception 'username cannot be changed';
  end if;
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  chosen_username text := nullif(meta->>'username', '');
  birth_text text := nullif(meta->>'birth_date', '');
  chosen_birth date := null;
  group_name text := nullif(meta->>'age_group', '');
  chosen_mascot text := nullif(meta->>'mascot', '');
begin
  if chosen_username is null or not public.username_is_allowed(chosen_username) then
    chosen_username := null;
  elsif exists (
    select 1 from public.profiles where pg_catalog.lower(username) = pg_catalog.lower(chosen_username)
  ) then
    chosen_username := null;
  end if;

  if birth_text is not null then
    begin
      chosen_birth := birth_text::date;
    exception
      when others then
        chosen_birth := null;
    end;
  end if;

  if chosen_birth is not null and public.age_group_from_birth_date(chosen_birth) = 'child' then
    raise exception 'birth date is under 13';
  end if;

  if group_name is null or group_name not in ('teen', 'adult', 'older') then
    if chosen_birth is not null then
      group_name := public.age_group_from_birth_date(chosen_birth);
    else
      group_name := 'adult';
    end if;
  end if;

  if chosen_mascot is null or chosen_mascot not in ('judah', 'agnes', 'shalom', 'zion', 'hunter') then
    chosen_mascot := 'judah';
  end if;

  begin
    insert into public.profiles (user_id, username, age_group, birth_date, mascot, points)
    values (new.id, chosen_username, group_name, chosen_birth, chosen_mascot, 0);
  exception
    when unique_violation then
      insert into public.profiles (user_id, username, age_group, birth_date, mascot, points)
      values (new.id, null, group_name, chosen_birth, chosen_mascot, 0);
  end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin, service_role;
