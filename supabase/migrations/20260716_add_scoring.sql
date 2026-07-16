-- 20260716_add_scoring.sql

-- 1. Add score column to game_history
ALTER TABLE game_history ADD COLUMN IF NOT EXISTS score integer NOT NULL DEFAULT 0;

-- 2. Update record_game_result to accept score
CREATE OR REPLACE FUNCTION record_game_result(
  p_player_id uuid,
  p_guesses_used int,
  p_won boolean,
  p_mode text,
  p_score integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_counts_toward_streak boolean := p_mode IS DISTINCT FROM 'unlimited';
  v_current_streak int;
  v_current_max_streak int;
  v_new_streak int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO game_history (user_id, player_id, guesses_used, won, mode, score)
  VALUES (v_uid, p_player_id, p_guesses_used, p_won, p_mode, p_score);

  SELECT streak, max_streak INTO v_current_streak, v_current_max_streak
  FROM profiles WHERE id = v_uid FOR UPDATE;

  v_new_streak := CASE
    WHEN NOT v_counts_toward_streak THEN v_current_streak
    WHEN p_won THEN v_current_streak + 1
    ELSE 0
  END;

  UPDATE profiles
  SET
    games_played = games_played + 1,
    games_won = games_won + (CASE WHEN p_won THEN 1 ELSE 0 END),
    streak = v_new_streak,
    max_streak = GREATEST(v_current_max_streak, v_new_streak)
  WHERE id = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION record_game_result(uuid, int, boolean, text, integer) TO authenticated;

-- 3. Update get_rankings to order by SUM(score)
DO $$ BEGIN
  DROP TYPE IF EXISTS ranking_row CASCADE;
  CREATE TYPE ranking_row AS (
    rank bigint,
    user_id uuid,
    username text,
    wins bigint,
    best_streak int,
    total_score bigint
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

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
  WHERE gh.mode = p_mode
  GROUP BY p.id, p.username, p.max_streak
  HAVING COUNT(*) FILTER (WHERE gh.won) > 0 OR COALESCE(SUM(gh.score), 0) > 0
  ORDER BY total_score DESC, wins DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION get_rankings(text) TO anon, authenticated;

-- Force Supabase API to reload its schema cache
NOTIFY pgrst, 'reload schema';
