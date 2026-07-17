-- 1. Create a unique index for daily games to prevent duplicate scores for the same puzzle
CREATE UNIQUE INDEX IF NOT EXISTS unique_daily_game_history
  ON game_history (user_id, player_id, mode)
  WHERE mode IN ('daily', 'coaches_daily', 'teams_daily');

-- 2. Update record_game_result to handle conflicts gracefully
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
  v_inserted_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Attempt to insert the history row. For daily modes, if it's a duplicate, it skips.
  INSERT INTO game_history (user_id, player_id, guesses_used, won, mode, score)
  VALUES (v_uid, p_player_id, p_guesses_used, p_won, p_mode, p_score)
  ON CONFLICT (user_id, player_id, mode) WHERE mode IN ('daily', 'coaches_daily', 'teams_daily')
  DO NOTHING
  RETURNING id INTO v_inserted_id;

  -- If it was a duplicate daily game, do not grant points or streak again!
  IF v_inserted_id IS NULL THEN
    RETURN;
  END IF;

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
