/*
# Add get_daily_player RPC for deterministic daily selection

1. New RPC: get_daily_player
- Takes a date_seed bigint (the UTC timestamp for the day).
- Uses a deterministic hash of the seed against the set of active player IDs to pick one player.
- Returns a single player row.
- This ensures everyone gets the same mystery player each day.
*/

CREATE OR REPLACE FUNCTION get_daily_player(date_seed bigint)
RETURNS players
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (ORDER BY id) as rn,
           COUNT(*) OVER () as total
    FROM players
    WHERE active = true
  )
  SELECT p.* FROM players p
  JOIN ranked r ON p.id = r.id
  WHERE r.rn = ((date_seed % r.total) + 1)
  LIMIT 1;
$$;
