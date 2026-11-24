-- Guests may read visible devotion comments. Apply later.
-- Do not run this from the app, and do not apply it from this change.
-- Anon can select only the public comment columns, and only rows that are
-- not hidden or removed. Birth dates and other profile fields stay private.
-- The read function returns a display name and mascot, never a user id or email.

create policy devotion_comments_select_visible on public.devotion_comments
  for select to anon
  using (hidden_at is null and removed_at is null);

grant select (id, devotion_id, devotion_date, body, created_at)
  on public.devotion_comments to anon;

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
    (select auth.uid()) is not null and c.user_id = (select auth.uid())
  from public.devotion_comments c
  join public.profiles p on p.user_id = c.user_id
  where c.devotion_date = for_date
    and c.hidden_at is null
    and c.removed_at is null
  order by c.created_at asc;
$$;

revoke all on function public.devotion_comments_for_date(date) from public;
grant execute on function public.devotion_comments_for_date(date) to anon, authenticated;
