-- Per-player badge retry clocks. Apply later with the Supabase CLI.
-- Do not run this from the app, and do not apply it from this change.
-- Chris approves before this is applied.
-- One jsonb object on the player's profile. Keys are badge ids, never mascot ids.
-- The object stores a retry time and the question ids answered correctly in the
-- open attempt. It does not store verse text or the answer.

alter table public.profiles
  add column if not exists badge_retries jsonb not null default '{}'::jsonb;

alter table public.profiles
  drop constraint if exists profiles_badge_retries_is_object;

alter table public.profiles
  add constraint profiles_badge_retries_is_object
  check (jsonb_typeof(badge_retries) = 'object');

comment on column public.profiles.badge_retries is
  'Per player, keyed by badge id, never by mascot. Retry time and the questions answered correctly in the open attempt. No verse text.';
