-- Devotion comments, reports, and bans. Apply later with the Supabase CLI.
-- Do not run this from the app, and do not apply it from this change.
-- Comments store the player's own words. They do not store verse text.
-- Signed-in players can read visible comments. A player can insert and delete
-- only their own row. One report hides a comment for everyone. Admin changes
-- use the service role from a server route, not the browser.

create table public.devotion_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  devotion_id text not null check (char_length(devotion_id) between 1 and 80),
  devotion_date date not null,
  body text not null check (char_length(btrim(body)) between 1 and 280),
  created_at timestamptz not null default now(),
  hidden_at timestamptz,
  removed_at timestamptz
);

create index devotion_comments_date_idx
  on public.devotion_comments (devotion_date, created_at);

create index devotion_comments_user_day_idx
  on public.devotion_comments (user_id, created_at);

create table public.devotion_comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.devotion_comments (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (comment_id, reporter_id)
);

create table public.devotion_comment_bans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  banned_at timestamptz not null default now()
);

create table public.devotion_comment_terms (
  term text primary key check (term ~ '^[a-z]+( [a-z]+)*$'),
  category text not null check (category in ('profanity', 'threat', 'other_gods'))
);

insert into public.devotion_comment_terms (term, category) values
  ('ass', 'profanity'),
  ('asshole', 'profanity'),
  ('bastard', 'profanity'),
  ('bitch', 'profanity'),
  ('bullshit', 'profanity'),
  ('cock', 'profanity'),
  ('crap', 'profanity'),
  ('cunt', 'profanity'),
  ('damn', 'profanity'),
  ('dick', 'profanity'),
  ('fag', 'profanity'),
  ('faggot', 'profanity'),
  ('fuck', 'profanity'),
  ('goddamn', 'profanity'),
  ('motherfucker', 'profanity'),
  ('nigga', 'profanity'),
  ('nigger', 'profanity'),
  ('piss', 'profanity'),
  ('porn', 'profanity'),
  ('pussy', 'profanity'),
  ('shit', 'profanity'),
  ('slut', 'profanity'),
  ('whore', 'profanity'),
  ('assault', 'threat'),
  ('beat you', 'threat'),
  ('bomb', 'threat'),
  ('hurt you', 'threat'),
  ('kill', 'threat'),
  ('kill yourself', 'threat'),
  ('murder', 'threat'),
  ('rape', 'threat'),
  ('shoot', 'threat'),
  ('stab', 'threat'),
  ('strangle', 'threat'),
  ('allah', 'other_gods'),
  ('anubis', 'other_gods'),
  ('apollo', 'other_gods'),
  ('athena', 'other_gods'),
  ('brahma', 'other_gods'),
  ('buddha', 'other_gods'),
  ('durga', 'other_gods'),
  ('ganesh', 'other_gods'),
  ('ganesha', 'other_gods'),
  ('hades', 'other_gods'),
  ('horus', 'other_gods'),
  ('isis', 'other_gods'),
  ('juno', 'other_gods'),
  ('jupiter', 'other_gods'),
  ('kali', 'other_gods'),
  ('krishna', 'other_gods'),
  ('loki', 'other_gods'),
  ('odin', 'other_gods'),
  ('osiris', 'other_gods'),
  ('poseidon', 'other_gods'),
  ('quetzalcoatl', 'other_gods'),
  ('ra', 'other_gods'),
  ('shiva', 'other_gods'),
  ('thor', 'other_gods'),
  ('vishnu', 'other_gods');

comment on table public.devotion_comments is
  'Player comments on a daily devotion. The body is the player''s words, not verse text.';

create or replace function public.devotion_comment_pattern(term text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  i integer := 1;
  ch text;
  n integer;
  out text := '';
begin
  while i <= char_length(term) loop
    ch := substr(term, i, 1);
    n := 1;
    while i + n <= char_length(term) and substr(term, i + n, 1) = ch loop
      n := n + 1;
    end loop;
    if n >= 2 then
      out := out || ch || '{' || n::text || ',}';
    else
      out := out || ch || '+';
    end if;
    i := i + n;
  end loop;
  return out;
end;
$$;

create or replace function public.devotion_comment_blocked(raw text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  light text;
  tokens text[];
  token text;
  buf text := '';
  rebuilt text := '';
  word text;
  collapsed text;
  term_row record;
  pattern text;
begin
  if raw is null or btrim(raw) = '' then
    return true;
  end if;
  if char_length(btrim(raw)) > 280 then
    return true;
  end if;
  if raw ~* 'https?://' or raw ~* 'www\.' then
    return true;
  end if;
  if raw ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' then
    return true;
  end if;
  if raw ~* '\y[a-z0-9-]+\.(com|net|org|io|co|app|gg|me)\y' then
    return true;
  end if;
  if raw ~ '\d{7,}' or char_length(regexp_replace(raw, '\D', '', 'g')) >= 10 then
    return true;
  end if;

  light := translate(lower(raw), '013457@$!', 'oieastasi');
  light := trim(regexp_replace(regexp_replace(light, '[^a-z]+', ' ', 'g'), '\s+', ' ', 'g'));
  tokens := regexp_split_to_array(light, ' ');
  if tokens is not null then
    foreach token in array tokens loop
      if token is null or token = '' then
        continue;
      elsif char_length(token) = 1 then
        buf := buf || token;
      else
        if char_length(buf) >= 3 then
          rebuilt := rebuilt || ' ' || buf;
        elsif char_length(buf) > 0 then
          rebuilt := rebuilt || ' ' || trim(regexp_replace(buf, '(.)', '\1 ', 'g'));
        end if;
        buf := '';
        rebuilt := rebuilt || ' ' || token;
      end if;
    end loop;
  end if;
  if char_length(buf) >= 3 then
    rebuilt := rebuilt || ' ' || buf;
  elsif char_length(buf) > 0 then
    rebuilt := rebuilt || ' ' || trim(regexp_replace(buf, '(.)', '\1 ', 'g'));
  end if;
  rebuilt := trim(regexp_replace(rebuilt, '\s+', ' ', 'g'));

  for term_row in select term from public.devotion_comment_terms loop
    if position(' ' in term_row.term) > 0 then
      if rebuilt ~ ('\y' || term_row.term || '\y') then
        return true;
      end if;
    else
      pattern := public.devotion_comment_pattern(term_row.term);
      foreach word in array regexp_split_to_array(rebuilt, ' ') loop
        if word is null or word = '' then
          continue;
        end if;
        collapsed := regexp_replace(word, '(.)\1{2,}', '\1', 'g');
        if word ~ ('^(?:' || pattern || ')$') or collapsed ~ ('^(?:' || pattern || ')$') then
          return true;
        end if;
      end loop;
    end if;
  end loop;
  return false;
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
begin
  if uid is null then
    return false;
  end if;
  select birth_date into birth
  from public.profiles
  where user_id = uid;
  if not found or birth is null then
    return false;
  end if;
  if exists (select 1 from public.devotion_comment_bans where user_id = uid) then
    return false;
  end if;
  return public.age_group_from_birth_date(birth) <> 'child';
end;
$$;

create or replace function public.devotion_comment_count_today()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.devotion_comments
  where user_id = (select auth.uid())
    and (created_at at time zone 'America/Chicago')::date
      = (now() at time zone 'America/Chicago')::date;
$$;

create or replace function public.devotion_comments_for_date(for_date date)
returns table (
  id uuid,
  body text,
  created_at timestamptz,
  username text,
  mascot text,
  mine boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.body,
    c.created_at,
    coalesce(nullif(p.username, ''), 'Player'),
    case
      when p.mascot in ('judah', 'agnes', 'shalom', 'zion', 'hunter') then p.mascot
      else 'judah'
    end,
    c.user_id = (select auth.uid())
  from public.devotion_comments c
  join public.profiles p on p.user_id = c.user_id
  where (select auth.uid()) is not null
    and c.devotion_date = for_date
    and c.hidden_at is null
    and c.removed_at is null
  order by c.created_at asc;
$$;

create or replace function public.guard_devotion_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  posted_today integer;
begin
  if (select auth.uid()) is distinct from new.user_id then
    raise exception 'comment rejected';
  end if;
  if char_length(btrim(new.body)) > 280 then
    raise exception 'comment too long';
  end if;
  if not public.devotion_comment_may_write() then
    raise exception 'comment closed';
  end if;
  if public.devotion_comment_blocked(new.body) then
    raise exception 'comment blocked';
  end if;
  select count(*)::integer into posted_today
  from public.devotion_comments
  where user_id = new.user_id
    and (created_at at time zone 'America/Chicago')::date
      = (now() at time zone 'America/Chicago')::date;
  if posted_today >= 3 then
    raise exception 'comment rate limit';
  end if;
  new.body := btrim(new.body);
  return new;
end;
$$;

create trigger devotion_comments_guard
  before insert on public.devotion_comments
  for each row
  execute function public.guard_devotion_comment();

create or replace function public.hide_devotion_comment_on_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.devotion_comments
  set hidden_at = coalesce(hidden_at, now())
  where id = new.comment_id;
  return new;
end;
$$;

create trigger devotion_comment_reports_hide
  after insert on public.devotion_comment_reports
  for each row
  execute function public.hide_devotion_comment_on_report();

alter table public.devotion_comments enable row level security;
alter table public.devotion_comment_reports enable row level security;
alter table public.devotion_comment_bans enable row level security;
alter table public.devotion_comment_terms enable row level security;

create policy devotion_comments_select_own on public.devotion_comments
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy devotion_comments_insert_own on public.devotion_comments
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy devotion_comments_delete_own on public.devotion_comments
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy devotion_comment_reports_select_own on public.devotion_comment_reports
  for select to authenticated
  using ((select auth.uid()) = reporter_id);

create policy devotion_comment_reports_insert_own on public.devotion_comment_reports
  for insert to authenticated
  with check ((select auth.uid()) = reporter_id);

revoke all on public.devotion_comments from anon, public;
revoke all on public.devotion_comment_reports from anon, public;
revoke all on public.devotion_comment_bans from anon, public;
revoke all on public.devotion_comment_terms from anon, public;

grant select, insert, delete on public.devotion_comments to authenticated;
grant select, insert on public.devotion_comment_reports to authenticated;

revoke all on function public.devotion_comment_pattern(text) from public;
revoke all on function public.devotion_comment_blocked(text) from public;
revoke all on function public.devotion_comment_may_write() from public;
revoke all on function public.devotion_comment_count_today() from public;
revoke all on function public.devotion_comments_for_date(date) from public;
revoke all on function public.guard_devotion_comment() from public;
revoke all on function public.hide_devotion_comment_on_report() from public;

grant execute on function public.devotion_comment_may_write() to authenticated;
grant execute on function public.devotion_comment_count_today() to authenticated;
grant execute on function public.devotion_comments_for_date(date) to authenticated;
