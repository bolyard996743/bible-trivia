-- Earned badges belong to the player, and so does the rest of their progress.
-- Apply later with the Supabase CLI. Do not run this from the app.
--
-- first_try_correct already exists. Older rows left it null. A mastered
-- question with no misses is a first try, which is what fills a badge.
-- The app treats null the same way, so badges show before and after this
-- backfill. Running it stores that flag on the row.
--
-- profiles.mascot is only the chosen guide. Progress tables are keyed by
-- user_id. If question_progress gained a mascot column, this folds every
-- guide's row into one player row (a first try wins, mastery wins, the
-- higher miss count stays) and drops the column. When that column is
-- absent, the block does nothing.

update public.question_progress
set first_try_correct = true
where first_try_correct is null
  and mastered = true
  and miss_count = 0;

update public.question_progress
set first_try_correct = false
where first_try_correct is null
  and mastered = true
  and miss_count > 0;

do $$
declare
  mascot_column boolean;
  pk_name text;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'question_progress'
      and column_name = 'mascot'
  ) into mascot_column;

  if not mascot_column then
    return;
  end if;

  create temporary table question_progress_folded on commit drop as
  select
    user_id,
    question_id,
    max(miss_count) as miss_count,
    bool_or(mastered) as mastered,
    max(updated_at) as updated_at,
    case
      when bool_or(coalesce(first_try_correct, false)) then true
      when bool_or(first_try_correct is null and mastered and miss_count = 0) then true
      when bool_or(first_try_correct is false) then false
      else null
    end as first_try_correct,
    max(season_id) as season_id,
    max(stage) as stage
  from public.question_progress
  group by user_id, question_id;

  select conname into pk_name
  from pg_constraint
  where conrelid = 'public.question_progress'::regclass
    and contype = 'p';
  if pk_name is not null then
    execute format('alter table public.question_progress drop constraint %I', pk_name);
  end if;
  delete from public.question_progress;
  alter table public.question_progress drop column mascot;

  insert into public.question_progress (
    user_id,
    question_id,
    miss_count,
    mastered,
    updated_at,
    first_try_correct,
    season_id,
    stage
  )
  select
    user_id,
    question_id,
    miss_count,
    mastered,
    coalesce(updated_at, now()),
    first_try_correct,
    season_id,
    stage
  from question_progress_folded;

  alter table public.question_progress
    add primary key (user_id, question_id);
end $$;
