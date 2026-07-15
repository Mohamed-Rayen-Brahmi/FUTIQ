/*
  # Close client-side stat manipulation gap

  1. Problem
  - The client currently computes new streak/games_played/games_won values
    itself and writes them directly via `profiles.update(...)`. The RLS
    policy only checks row ownership (auth.uid() = id), not whether the
    submitted values are plausible — so any authenticated user could open
    devtools and set their own streak/games_won to any number they want.
  - The guest-to-account migration has the same shape of issue.

  2. Fix
  - Add a `mode` column to `game_history` so streak logic (which excludes
    Unlimited mode) can be computed server-side, not client-side.
  - Add `record_game_result(...)`: a SECURITY DEFINER RPC that inserts the
    game_history row AND updates the caller's own profile stats based on
    the *currently stored* streak in the database, not a client-supplied
    number. The client can only say "I won/lost this round in this mode" —
    it can no longer set the resulting streak directly.
  - Add `merge_guest_stats(...)`: a SECURITY DEFINER RPC for the one-time
    guest-to-account merge, guarded so it only does anything on a genuinely
    fresh profile (games_played = 0), and clamps inputs to a sane maximum
    so even a manipulated localStorage value can't produce absurd numbers.
  - Revoke direct client UPDATE access to profiles' stat columns entirely —
    only `username` remains client-updatable. Both RPCs run as SECURITY
    DEFINER, so they can still update stats internally despite this.

  3. Honest scope note
  - This closes the "edit my own numbers directly" hole. It does not (and
    practically cannot, without a fully server-authoritative game engine)
    stop someone from calling record_game_result claiming a win they didn't
    legitimately play. That's a much larger architectural change and isn't
    warranted for this game's stakes (bragging-rights stats, not anything
    financial) — this migration fixes the actual exploitable gap without
    over-engineering the rest.
*/

ALTER TABLE game_history
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'daily'
  CHECK (mode IN ('daily', 'training', 'unlimited'));

-- Records a completed round: inserts the history row and updates the
-- caller's own profile stats server-side, based on the stored streak.
CREATE OR REPLACE FUNCTION record_game_result(
  p_player_id uuid,
  p_guesses_used int,
  p_won boolean,
  p_mode text
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

  INSERT INTO game_history (user_id, player_id, guesses_used, won, mode)
  VALUES (v_uid, p_player_id, p_guesses_used, p_won, p_mode);

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

-- One-time guest-progress merge on signup. Only takes effect on a
-- genuinely fresh profile; inputs are clamped so even a tampered
-- localStorage value can't produce an unbounded number.
CREATE OR REPLACE FUNCTION merge_guest_stats(
  p_games_played int,
  p_games_won int,
  p_streak int,
  p_max_streak int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_current_games_played int;
  v_current_max_streak int;
  v_cap constant int := 100000;
  v_gp int;
  v_gw int;
  v_streak int;
  v_max_streak int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT games_played, max_streak INTO v_current_games_played, v_current_max_streak
  FROM profiles WHERE id = v_uid FOR UPDATE;

  -- Only merge into a genuinely fresh account, exactly as the client-side
  -- check used to do, but now enforced where it can't be skipped.
  IF v_current_games_played > 0 THEN
    RETURN;
  END IF;

  v_gp := GREATEST(0, LEAST(p_games_played, v_cap));
  v_gw := GREATEST(0, LEAST(p_games_won, v_gp));
  v_streak := GREATEST(0, LEAST(p_streak, v_cap));
  v_max_streak := GREATEST(0, LEAST(p_max_streak, v_cap));

  UPDATE profiles
  SET
    games_played = v_gp,
    games_won = v_gw,
    streak = v_streak,
    max_streak = GREATEST(v_current_max_streak, v_max_streak, v_streak)
  WHERE id = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION record_game_result(uuid, int, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION merge_guest_stats(int, int, int, int) TO authenticated;

-- Lock down direct writes to profiles' stat columns now that both real
-- write paths go through the RPCs above (which bypass this as SECURITY
-- DEFINER). Only username stays client-updatable.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (username) ON public.profiles TO authenticated;
