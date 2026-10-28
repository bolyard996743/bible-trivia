-- Phase 4 accounts. Apply later with the Supabase CLI. Do not run this from the app.
-- The browser uses the anon key only. Row-level security ties every row to auth.uid().

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  age_group text not null check (age_group in ('teen', 'adult', 'older')),
  mascot text not null check (mascot in ('judah', 'agnes', 'shalom', 'zion', 'hunter')),
  sound_on boolean not null default true,
  placement_complete boolean not null default false,
  placement_cycle integer,
  placement_tier text check (placement_tier in ('foundation', 'intermediate', 'advanced', 'expert')),
  placement_earned integer,
  placement_possible integer,
  placement_stage text check (
    placement_stage in ('Seed', 'Sprout', 'Rooted', 'Growing', 'Established', 'Fruitful', 'Deep Roots')
  ),
  cycle integer not null default 1 check (cycle >= 1),
  tier text not null default 'foundation' check (tier in ('foundation', 'intermediate', 'advanced', 'expert')),
  streak integer not null default 0 check (streak >= 0),
  best_streak integer not null default 0 check (best_streak >= 0),
  season_mastered_count integer not null default 0 check (season_mastered_count >= 0),
  last_visited_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.question_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id text not null,
  miss_count integer not null default 0 check (miss_count >= 0),
  mastered boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create table public.verse_marks (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  book_id text not null,
  chapter integer not null check (chapter >= 1),
  verse_start integer not null check (verse_start >= 1),
  verse_end integer not null check (verse_end >= verse_start),
  color text check (color in ('gold', 'grove', 'calm')),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.profiles enable row level security;
alter table public.question_progress enable row level security;
alter table public.verse_marks enable row level security;

create policy profiles_select_own on public.profiles
  for select using (auth.uid() = user_id);
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = user_id);
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy profiles_delete_own on public.profiles
  for delete using (auth.uid() = user_id);

create policy question_progress_select_own on public.question_progress
  for select using (auth.uid() = user_id);
create policy question_progress_insert_own on public.question_progress
  for insert with check (auth.uid() = user_id);
create policy question_progress_update_own on public.question_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy question_progress_delete_own on public.question_progress
  for delete using (auth.uid() = user_id);

create policy verse_marks_select_own on public.verse_marks
  for select using (auth.uid() = user_id);
create policy verse_marks_insert_own on public.verse_marks
  for insert with check (auth.uid() = user_id);
create policy verse_marks_update_own on public.verse_marks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy verse_marks_delete_own on public.verse_marks
  for delete using (auth.uid() = user_id);

revoke all on public.profiles from anon, public;
revoke all on public.question_progress from anon, public;
revoke all on public.verse_marks from anon, public;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.question_progress to authenticated;
grant select, insert, update, delete on public.verse_marks to authenticated;
