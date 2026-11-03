-- Shared scripture chapter cache. Apply later with the Supabase CLI.
-- Do not run this from the app, and do not apply it from this change.
-- One row per chapter for every player. Rows are not owned by an account.
-- payload is AES-256-GCM ciphertext sealed with SCRIPTURE_CACHE_KEY.
-- It is not verse text. Do not add a column for verse wording.
-- The browser cannot read or write this table. There is no public export route.
-- Replace a row before fetched_at is 30 days old. This cache is not tied to an
-- account, so deleting an account does not have to cascade these rows.

create table public.scripture_chapter_cache (
  book_id text not null,
  chapter integer not null check (chapter >= 1),
  payload text not null,
  fetched_at timestamptz not null,
  primary key (book_id, chapter)
);

comment on table public.scripture_chapter_cache is
  'Shared encrypted NKJV chapter cache. payload is ciphertext, not verse text. Not exportable. Refresh within 30 days.';

comment on column public.scripture_chapter_cache.payload is
  'AES-256-GCM ciphertext of the chapter verses, copyright, and FUMS token. Not verse text.';

comment on column public.scripture_chapter_cache.fetched_at is
  'When this chapter was fetched from API.Bible. Refresh before 30 days.';

alter table public.scripture_chapter_cache enable row level security;

revoke all on public.scripture_chapter_cache from anon, authenticated, public;

-- No policies. anon and authenticated cannot select or write.
-- The server uses SUPABASE_SECRET_KEY, which bypasses row level security.
grant select, insert, update, delete on public.scripture_chapter_cache to service_role;
