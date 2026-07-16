-- 20260716_global_rankings.sql

CREATE OR REPLACE FUNCTION get_rankings(p_mode text)
RETURNS SETOF ranking_row
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(gh.score), 0) DESC, COUNT(*) FILTER (WHERE gh.won) DESC) as rank,
    p.id as user_id,
    p.username,
    COUNT(*) FILTER (WHERE gh.won) as wins,
    p.max_streak as best_streak,
    COALESCE(SUM(gh.score), 0) as total_score
  FROM profiles p
  JOIN game_history gh ON gh.user_id = p.id
  WHERE p_mode = 'all' OR gh.mode = p_mode
  GROUP BY p.id, p.username, p.max_streak
  HAVING COUNT(*) FILTER (WHERE gh.won) > 0 OR COALESCE(SUM(gh.score), 0) > 0
  ORDER BY total_score DESC, wins DESC
  LIMIT 50;
$$;

NOTIFY pgrst, 'reload schema';
