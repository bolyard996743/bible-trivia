-- Bible reader highlights and notes. Apply later with the Supabase CLI.
-- Do not run this from the app, and do not apply it from this change.
-- verse_marks stores a book id, chapter, and verse range, plus the player's own note.
-- It does not store NKJV verse text. Account deletion removes these rows at once
-- (on delete cascade on user_id), which is inside the 72 hour window for any
-- account-tied scripture cache. This table is not a scripture cache.

comment on table public.verse_marks is
  'Owner highlights and notes. Columns are the verse reference (book, chapter, verse ids) and the player note. Do not add verse text.';

comment on column public.verse_marks.book_id is 'Bible book id such as JHN. Not verse text.';
comment on column public.verse_marks.chapter is 'Chapter number.';
comment on column public.verse_marks.verse_start is 'First verse id in the highlight.';
comment on column public.verse_marks.verse_end is 'Last verse id in the highlight.';
comment on column public.verse_marks.note is 'The player''s own note. Not a copy of the verse.';

create index if not exists verse_marks_user_chapter_idx
  on public.verse_marks (user_id, book_id, chapter);

alter table public.verse_marks enable row level security;

drop policy if exists verse_marks_select_own on public.verse_marks;
drop policy if exists verse_marks_insert_own on public.verse_marks;
drop policy if exists verse_marks_update_own on public.verse_marks;
drop policy if exists verse_marks_delete_own on public.verse_marks;

create policy verse_marks_select_own on public.verse_marks
  for select using ((select auth.uid()) = user_id);
create policy verse_marks_insert_own on public.verse_marks
  for insert with check ((select auth.uid()) = user_id);
create policy verse_marks_update_own on public.verse_marks
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy verse_marks_delete_own on public.verse_marks
  for delete using ((select auth.uid()) = user_id);

revoke all on public.verse_marks from anon, public;
grant select, insert, update, delete on public.verse_marks to authenticated;
