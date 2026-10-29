-- Let signed-out players read the top 15. The function still returns only
-- username, points, and rank. Apply later. This repo does not run migrations.

grant execute on function public.leaderboard_top() to anon;
