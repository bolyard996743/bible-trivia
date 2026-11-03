-- Keep attempt scores stable across a reload.
-- Apply later. This repo does not run migrations.
-- award_question_points stores the miss count and scores from the higher of
-- the reported count and the count already saved for that question. A reloaded
-- page cannot turn a 5- or 2-point attempt into a first-try 10.

create or replace function public.award_question_points(
  question_id text,
  miss_count integer,
  season_id text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
  reported integer := greatest(coalesce(miss_count, 0), 0);
  stored integer;
  earned integer;
  total integer;
begin
  if uid is null then
    raise exception 'not signed in';
  end if;

  insert into public.question_progress (user_id, question_id, miss_count, mastered)
  values (uid, award_question_points.question_id, reported, false)
  on conflict (user_id, question_id) do update
    set miss_count = greatest(public.question_progress.miss_count, excluded.miss_count),
        updated_at = now();

  select qp.miss_count into stored
  from public.question_progress qp
  where qp.user_id = uid
    and qp.question_id = award_question_points.question_id;

  if coalesce(stored, reported) <= 0 then
    earned := 10;
  elsif stored = 1 then
    earned := 5;
  else
    earned := 2;
  end if;

  insert into public.question_awards (user_id, question_id, season_id, points)
  values (uid, award_question_points.question_id, award_question_points.season_id, earned)
  on conflict (user_id, question_id, season_id) do nothing;
  if not found then
    select coalesce(sum(points), 0) into total from public.question_awards where user_id = uid;
    return total;
  end if;

  update public.profiles set points = points + earned where user_id = uid;
  select points into total from public.profiles where user_id = uid;
  return coalesce(total, earned);
end;
$$;

revoke all on function public.award_question_points(text, integer, text) from public, anon;
grant execute on function public.award_question_points(text, integer, text) to authenticated;
