/*
  # Add League-Specific Daily Modes & Popular Players Filter

  1. Schema Updates:
  - Add `is_popular` to `players` table.
  - Drop the `game_history_mode_check` on `game_history` to allow dynamic league strings.

  2. RPC Updates:
  - `get_daily_player(date_seed bigint, p_league text DEFAULT NULL)`
  - `get_random_player(exclude_player_id uuid DEFAULT NULL, p_league text DEFAULT NULL)`
  - `search_players(search_query text, p_league text DEFAULT NULL)`
*/

-- 1. Add is_popular flag to players
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_popular boolean NOT NULL DEFAULT false;

-- Create an index for faster queries on popular players
CREATE INDEX IF NOT EXISTS idx_players_popular ON players (active, is_popular, league);

-- Temporary script: Auto-flag the first 20 players of each club as "popular" so the game works immediately
-- The admin can refine this list later in the dashboard
-- We MUST ensure they have an image_url, otherwise the game looks broken!

-- First, reset everyone to false just in case
UPDATE players SET is_popular = false;

WITH ranked_players AS (
  SELECT id, 
         ROW_NUMBER() OVER(PARTITION BY club ORDER BY age ASC, id) as rn
  FROM players
  WHERE active = true
    AND image_url IS NOT NULL
    AND image_url != ''
)
UPDATE players
SET is_popular = true
FROM ranked_players
WHERE players.id = ranked_players.id AND ranked_players.rn <= 20;

-- 2. Drop the restrictive mode check to allow "daily_premier-league", etc.
ALTER TABLE game_history
  DROP CONSTRAINT IF EXISTS game_history_mode_check;

-- 3. Update get_daily_player
CREATE OR REPLACE FUNCTION get_daily_player(date_seed bigint, p_league text DEFAULT NULL)
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
      AND is_popular = true
      AND (p_league IS NULL OR lower(trim(league)) = lower(trim(p_league)))
  )
  SELECT p.* FROM players p
  JOIN ranked r ON p.id = r.id
  WHERE r.rn = ((date_seed % r.total) + 1)
  LIMIT 1;
$$;

-- 4. Update get_random_player
CREATE OR REPLACE FUNCTION get_random_player(exclude_player_id uuid DEFAULT NULL, p_league text DEFAULT NULL)
RETURNS players
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM players
  WHERE active = true
    AND is_popular = true
    AND (p_league IS NULL OR lower(trim(league)) = lower(trim(p_league)))
    AND (exclude_player_id IS NULL OR id <> exclude_player_id)
  ORDER BY random()
  LIMIT 1;
$$;

-- 5. Update search_players
-- Note: It now filters by p_league AND is_popular if p_league is provided!
-- If p_league is NULL, we assume it's Who Am I or a generic mode, so we search all active players.
CREATE OR REPLACE FUNCTION search_players(search_query text, p_league text DEFAULT NULL)
RETURNS SETOF players
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM players
  WHERE active = true
    AND (
      p_league IS NULL 
      OR 
      (lower(trim(league)) = lower(trim(p_league)) AND is_popular = true)
    )
    AND unaccent(name) ILIKE unaccent('%' || search_query || '%')
  ORDER BY name
  LIMIT 10;
$$;
