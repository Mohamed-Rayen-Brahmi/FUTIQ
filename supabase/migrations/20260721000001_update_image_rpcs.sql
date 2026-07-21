/*
  # Update image and ID RPCs for leagues

  1. Updates:
  - `get_daily_player_image`
  - `get_daily_player_id`
  - `check_player_guess`
*/

CREATE OR REPLACE FUNCTION get_daily_player_id(date_seed bigint, p_league text DEFAULT NULL)
RETURNS uuid
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
  SELECT p.id FROM players p
  JOIN ranked r ON p.id = r.id
  WHERE r.rn = ((date_seed % r.total) + 1)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_daily_player_image(date_seed bigint, p_league text DEFAULT NULL)
RETURNS text
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
  SELECT p.image_url FROM players p
  JOIN ranked r ON p.id = r.id
  WHERE r.rn = ((date_seed % r.total) + 1)
  LIMIT 1;
$$;


CREATE OR REPLACE FUNCTION check_player_guess(
  p_guess_id uuid,
  p_date_seed bigint,
  p_guess_number int,
  p_league text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_answer players%ROWTYPE;
  v_guess players%ROWTYPE;
  v_is_correct boolean;
  v_reveal boolean;
  v_cells jsonb;
  v_result jsonb;
  v_name_status text;
  v_nation_status text;
  v_league_status text;
  v_club_status text;
  v_pos_status text;
  v_age_status text; v_age_arrow text;
  v_shirt_status text; v_shirt_arrow text;
BEGIN
  -- Resolve today's answer
  SELECT p.* INTO v_answer FROM players p
  WHERE p.id = (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (ORDER BY id) as rn, COUNT(*) OVER () as total
      FROM players 
      WHERE active = true 
        AND is_popular = true
        AND (p_league IS NULL OR lower(trim(league)) = lower(trim(p_league)))
    ) ranked WHERE total > 0 AND rn = ((p_date_seed % total) + 1)
  );

  IF v_answer IS NULL THEN
    RETURN jsonb_build_object('error', 'No active popular players available in this league');
  END IF;

  SELECT * INTO v_guess FROM players WHERE id = p_guess_id AND active = true;
  IF v_guess IS NULL THEN
    RETURN jsonb_build_object('error', 'Guessed player not found');
  END IF;

  -- Name
  v_is_correct := lower(trim(v_guess.name)) = lower(trim(v_answer.name));
  v_name_status := CASE WHEN v_is_correct THEN 'exact' ELSE 'none' END;

  -- Nation (close = same continent)
  IF v_guess.nation IS NULL OR v_answer.nation IS NULL THEN v_nation_status := 'none';
  ELSIF lower(trim(v_guess.nation)) = lower(trim(v_answer.nation)) THEN v_nation_status := 'exact';
  ELSIF v_guess.continent IS NOT NULL AND v_guess.continent = v_answer.continent THEN v_nation_status := 'close';
  ELSE v_nation_status := 'none'; END IF;

  -- League (close = same nation)
  IF v_guess.league IS NULL OR v_answer.league IS NULL THEN v_league_status := 'none';
  ELSIF lower(trim(v_guess.league)) = lower(trim(v_answer.league)) THEN v_league_status := 'exact';
  ELSIF v_guess.nation IS NOT NULL AND lower(trim(v_guess.nation)) = lower(trim(v_answer.nation)) THEN v_league_status := 'close';
  ELSE v_league_status := 'none'; END IF;

  -- Club (close = same league)
  IF v_guess.club IS NULL OR v_answer.club IS NULL THEN v_club_status := 'none';
  ELSIF lower(trim(v_guess.club)) = lower(trim(v_answer.club)) THEN v_club_status := 'exact';
  ELSIF v_guess.league IS NOT NULL AND lower(trim(v_guess.league)) = lower(trim(v_answer.league)) THEN v_club_status := 'close';
  ELSE v_club_status := 'none'; END IF;

  -- Position (close = same group)
  IF v_guess.position_code IS NULL OR v_answer.position_code IS NULL THEN v_pos_status := 'none';
  ELSIF v_guess.position_code = v_answer.position_code THEN v_pos_status := 'exact';
  ELSIF _pos_group(v_guess.position_code) IS NOT NULL AND _pos_group(v_guess.position_code) = _pos_group(v_answer.position_code) THEN v_pos_status := 'close';
  ELSE v_pos_status := 'none'; END IF;

  -- Age (close = within 2)
  IF v_guess.age IS NULL OR v_answer.age IS NULL THEN v_age_status := 'none'; v_age_arrow := NULL;
  ELSIF v_guess.age = v_answer.age THEN v_age_status := 'exact'; v_age_arrow := NULL;
  ELSE
    v_age_status := CASE WHEN abs(v_guess.age - v_answer.age) <= 2 THEN 'close' ELSE 'none' END;
    v_age_arrow := CASE WHEN v_answer.age > v_guess.age THEN 'up' ELSE 'down' END;
  END IF;

  -- Shirt (close = within 2)
  IF v_guess.shirt_number IS NULL OR v_answer.shirt_number IS NULL THEN v_shirt_status := 'none'; v_shirt_arrow := NULL;
  ELSIF v_guess.shirt_number = v_answer.shirt_number THEN v_shirt_status := 'exact'; v_shirt_arrow := NULL;
  ELSE
    v_shirt_status := CASE WHEN abs(v_guess.shirt_number - v_answer.shirt_number) <= 2 THEN 'close' ELSE 'none' END;
    v_shirt_arrow := CASE WHEN v_answer.shirt_number > v_guess.shirt_number THEN 'up' ELSE 'down' END;
  END IF;

  v_cells := jsonb_build_object(
    'name', v_name_status,
    'nation', v_nation_status,
    'league', v_league_status,
    'club', v_club_status,
    'position', v_pos_status,
    'age', jsonb_build_object('status', v_age_status, 'arrow', v_age_arrow),
    'shirt', jsonb_build_object('status', v_shirt_status, 'arrow', v_shirt_arrow)
  );

  v_reveal := v_is_correct OR p_guess_number >= 8;

  v_result := jsonb_build_object('cells', v_cells, 'is_correct', v_is_correct);

  IF v_reveal THEN
    v_result := v_result || jsonb_build_object('answer', row_to_json(v_answer)::jsonb);
  END IF;

  RETURN v_result;
END;
$$;
