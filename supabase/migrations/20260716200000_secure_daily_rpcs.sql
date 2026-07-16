-- 1. Revoke direct access to the full-row daily RPCs from public clients
-- The original functions take a bigint!
REVOKE EXECUTE ON FUNCTION get_daily_player(bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_daily_coach(bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_daily_team(bigint) FROM PUBLIC, anon, authenticated;

-- 2. Create lean RPCs that only return the ID for exclusion logic in Unlimited mode.
-- They must use the exact same modulo logic as the original functions so they exclude the correct player!
CREATE OR REPLACE FUNCTION get_daily_player_id(date_seed bigint)
RETURNS uuid AS $$
  WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (ORDER BY id) as rn,
           COUNT(*) OVER () as total
    FROM players
    WHERE active = true
  )
  SELECT r.id FROM ranked r
  WHERE r.rn = ((date_seed % r.total) + 1)
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_daily_coach_id(date_seed bigint)
RETURNS uuid AS $$
  WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (ORDER BY id) as rn,
           COUNT(*) OVER () as total
    FROM coaches
    WHERE active = true
  )
  SELECT r.id FROM ranked r
  WHERE r.rn = ((date_seed % r.total) + 1)
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_daily_team_id(date_seed bigint)
RETURNS uuid AS $$
  WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (ORDER BY id) as rn,
           COUNT(*) OVER () as total
    FROM teams
    WHERE active = true
  )
  SELECT r.id FROM ranked r
  WHERE r.rn = ((date_seed % r.total) + 1)
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 3. Grant access to these safe, lean RPCs
GRANT EXECUTE ON FUNCTION get_daily_player_id(bigint) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_daily_coach_id(bigint) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_daily_team_id(bigint) TO anon, authenticated;
