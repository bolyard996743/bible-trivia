-- Optional pgTAP check. Run later with `supabase test db` after the CLI and a local database are installed.
-- This environment does not apply migrations or start Postgres. tests/rls.test.ts checks the same rules in the migration file.

begin;

select plan(7);

select has_table('public', 'profiles', 'profiles exists');
select has_table('public', 'question_progress', 'question progress exists');
select has_table('public', 'verse_marks', 'verse marks exist');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'profiles has row level security'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.question_progress'::regclass),
  'question progress has row level security'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.verse_marks'::regclass),
  'verse marks have row level security'
);

select ok(
  (
    select count(*) = 12
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'question_progress', 'verse_marks')
      and (qual like '%auth.uid()%' or with_check like '%auth.uid()%')
  ),
  'twelve own-row policies use auth.uid()'
);

select finish();

rollback;
