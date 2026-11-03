-- Reader highlight colors. Apply later with the Supabase CLI.
-- Do not run this from the app, and do not apply it from this change.
-- verse_marks still stores only the reference (book, chapter, verse ids), a color, and the player's note.
-- It does not store NKJV verse text.

update public.verse_marks
set color = case color
  when 'gold' then 'yellow'
  when 'grove' then 'green'
  when 'calm' then 'blue'
  else color
end
where color in ('gold', 'grove', 'calm');

alter table public.verse_marks drop constraint if exists verse_marks_color_check;

alter table public.verse_marks
  add constraint verse_marks_color_check
  check (color is null or color in ('red', 'blue', 'green', 'orange', 'yellow'));

comment on column public.verse_marks.color is
  'Highlight color: red, blue, green, orange, or yellow. Not verse text.';
