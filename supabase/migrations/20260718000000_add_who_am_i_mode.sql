-- ============================================================
-- 1. Create who_am_i table
-- ============================================================
CREATE TABLE IF NOT EXISTS who_am_i (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  hint1 text NOT NULL,
  hint2 text NOT NULL,
  hint3 text NOT NULL,
  hint4 text NOT NULL,
  hint5 text NOT NULL,
  hint6 text NOT NULL,
  hint7 text NOT NULL,
  hint8 text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(player_id)
);

ALTER TABLE who_am_i ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_who_am_i" ON who_am_i;
CREATE POLICY "public_read_who_am_i"
  ON who_am_i FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================
-- 2. RPC: get_daily_who_am_i
-- ============================================================
CREATE OR REPLACE FUNCTION get_daily_who_am_i(date_seed bigint)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  WITH ranked AS (
    SELECT 
      w.id,
      w.player_id,
      w.hint1, w.hint2, w.hint3, w.hint4, w.hint5, w.hint6, w.hint7, w.hint8,
      ROW_NUMBER() OVER (ORDER BY w.id) as rn,
      COUNT(*) OVER () as total
    FROM who_am_i w
    WHERE w.active = true
  )
  SELECT jsonb_build_object(
    'id', r.id,
    'hints', jsonb_build_array(r.hint1, r.hint2, r.hint3, r.hint4, r.hint5, r.hint6, r.hint7, r.hint8)
  )
  FROM ranked r
  WHERE r.rn = ((date_seed % r.total) + 1)
  LIMIT 1;
$$;

-- ============================================================
-- 3. RPC: check_who_am_i_guess
-- ============================================================
CREATE OR REPLACE FUNCTION check_who_am_i_guess(
  p_guess_id uuid,
  p_date_seed bigint,
  p_guess_number int
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_answer who_am_i%ROWTYPE;
  v_is_correct boolean;
  v_reveal boolean;
  v_result jsonb;
  v_answer_player players%ROWTYPE;
BEGIN
  -- Resolve today's answer
  SELECT w.* INTO v_answer FROM who_am_i w
  WHERE w.id = (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (ORDER BY id) as rn, COUNT(*) OVER () as total
      FROM who_am_i WHERE active = true
    ) ranked WHERE total > 0 AND rn = ((p_date_seed % total) + 1)
  );

  IF v_answer IS NULL THEN
    RETURN jsonb_build_object('error', 'No active who am i challenges available');
  END IF;

  v_is_correct := (p_guess_id = v_answer.player_id);
  v_reveal := v_is_correct OR p_guess_number >= 8;
  v_result := jsonb_build_object('is_correct', v_is_correct);

  IF v_reveal THEN
    SELECT * INTO v_answer_player FROM players WHERE id = v_answer.player_id;
    v_result := v_result || jsonb_build_object('answer', row_to_json(v_answer_player)::jsonb);
  END IF;

  RETURN v_result;
END;
$$;

-- ============================================================
-- 4. RPC: search_all_players (includes inactive)
-- ============================================================
CREATE OR REPLACE FUNCTION search_all_players(search_query text)
RETURNS SETOF players
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM players
  WHERE unaccent(name) ILIKE unaccent('%' || search_query || '%')
  ORDER BY 
    active DESC, -- prioritize active players
    name ASC
  LIMIT 10;
$$;

-- ============================================================
-- 5. Alter game_history — expand mode CHECK
-- ============================================================
ALTER TABLE game_history DROP CONSTRAINT IF EXISTS game_history_mode_check;
ALTER TABLE game_history ADD CONSTRAINT game_history_mode_check
  CHECK (mode IN ('daily', 'training', 'unlimited', 'coaches_daily', 'teams_daily', 'who_am_i_daily'));

-- Also update the unique constraint
DROP INDEX IF EXISTS unique_daily_game_history;
CREATE UNIQUE INDEX unique_daily_game_history
  ON game_history (user_id, player_id, mode)
  WHERE mode IN ('daily', 'coaches_daily', 'teams_daily', 'who_am_i_daily');

-- ============================================================
-- Grants
-- ============================================================
GRANT SELECT ON who_am_i TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_daily_who_am_i(bigint) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_who_am_i_guess(uuid, bigint, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_all_players(text) TO anon, authenticated;
