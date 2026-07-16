-- =============================================================================
-- Server-Side Guess Checking + Rankings Permissions Fix
-- =============================================================================
-- Run this ENTIRE block in your Supabase SQL Editor.
-- It creates secure server-side comparison functions so the answer
-- is NEVER sent to the browser until the game is over.
-- =============================================================================

-- ─── Helper: Position group mapping ────────────────────────────────────────
CREATE OR REPLACE FUNCTION _pos_group(pos text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE upper(pos)
    WHEN 'GK' THEN 'GK'
    WHEN 'RB' THEN 'DEF' WHEN 'LB' THEN 'DEF' WHEN 'CB' THEN 'DEF' WHEN 'DF' THEN 'DEF' WHEN 'RWB' THEN 'DEF' WHEN 'LWB' THEN 'DEF'
    WHEN 'CM' THEN 'MID' WHEN 'CDM' THEN 'MID' WHEN 'CAM' THEN 'MID' WHEN 'RM' THEN 'MID' WHEN 'LM' THEN 'MID' WHEN 'MF' THEN 'MID'
    WHEN 'RW' THEN 'FWD' WHEN 'LW' THEN 'FWD' WHEN 'ST' THEN 'FWD' WHEN 'CF' THEN 'FWD' WHEN 'FW' THEN 'FWD' WHEN 'WF' THEN 'FWD'
    ELSE NULL
  END;
$$;

-- ─── Helper: Country → Continent mapping ───────────────────────────────────
CREATE OR REPLACE FUNCTION _get_continent(country text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE country
    WHEN 'England' THEN 'Europe' WHEN 'Spain' THEN 'Europe' WHEN 'Germany' THEN 'Europe' WHEN 'France' THEN 'Europe'
    WHEN 'Italy' THEN 'Europe' WHEN 'Portugal' THEN 'Europe' WHEN 'Netherlands' THEN 'Europe' WHEN 'Belgium' THEN 'Europe'
    WHEN 'Scotland' THEN 'Europe' WHEN 'Turkey' THEN 'Europe' WHEN 'Austria' THEN 'Europe' WHEN 'Switzerland' THEN 'Europe'
    WHEN 'Denmark' THEN 'Europe' WHEN 'Norway' THEN 'Europe' WHEN 'Sweden' THEN 'Europe' WHEN 'Poland' THEN 'Europe'
    WHEN 'Czech Republic' THEN 'Europe' WHEN 'Greece' THEN 'Europe' WHEN 'Croatia' THEN 'Europe' WHEN 'Serbia' THEN 'Europe'
    WHEN 'Romania' THEN 'Europe' WHEN 'Ukraine' THEN 'Europe' WHEN 'Russia' THEN 'Europe' WHEN 'Ireland' THEN 'Europe'
    WHEN 'Wales' THEN 'Europe' WHEN 'Hungary' THEN 'Europe' WHEN 'Finland' THEN 'Europe' WHEN 'Slovakia' THEN 'Europe'
    WHEN 'Slovenia' THEN 'Europe' WHEN 'Bulgaria' THEN 'Europe' WHEN 'Cyprus' THEN 'Europe'
    WHEN 'Brazil' THEN 'South America' WHEN 'Argentina' THEN 'South America' WHEN 'Colombia' THEN 'South America'
    WHEN 'Chile' THEN 'South America' WHEN 'Uruguay' THEN 'South America' WHEN 'Paraguay' THEN 'South America'
    WHEN 'Peru' THEN 'South America' WHEN 'Ecuador' THEN 'South America' WHEN 'Venezuela' THEN 'South America'
    WHEN 'United States' THEN 'North America' WHEN 'Mexico' THEN 'North America' WHEN 'Canada' THEN 'North America'
    WHEN 'Costa Rica' THEN 'North America' WHEN 'Honduras' THEN 'North America' WHEN 'Jamaica' THEN 'North America'
    WHEN 'Japan' THEN 'Asia' WHEN 'South Korea' THEN 'Asia' WHEN 'China' THEN 'Asia' WHEN 'Saudi Arabia' THEN 'Asia'
    WHEN 'UAE' THEN 'Asia' WHEN 'India' THEN 'Asia' WHEN 'Thailand' THEN 'Asia' WHEN 'Qatar' THEN 'Asia' WHEN 'Iran' THEN 'Asia'
    WHEN 'Australia' THEN 'Oceania'
    WHEN 'South Africa' THEN 'Africa' WHEN 'Egypt' THEN 'Africa' WHEN 'Nigeria' THEN 'Africa' WHEN 'Morocco' THEN 'Africa'
    WHEN 'Tunisia' THEN 'Africa' WHEN 'Algeria' THEN 'Africa' WHEN 'Ghana' THEN 'Africa' WHEN 'Cameroon' THEN 'Africa'
    WHEN 'Senegal' THEN 'Africa' WHEN 'Ivory Coast' THEN 'Africa'
    ELSE NULL
  END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- CHECK PLAYER GUESS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION check_player_guess(
  p_guess_id uuid,
  p_date_seed bigint,
  p_guess_number int
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
  -- Resolve today's answer internally (same logic as get_daily_player)
  SELECT p.* INTO v_answer FROM players p
  WHERE p.id = (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (ORDER BY id) as rn, COUNT(*) OVER () as total
      FROM players WHERE active = true
    ) ranked WHERE total > 0 AND rn = ((p_date_seed % total) + 1)
  );

  IF v_answer IS NULL THEN
    RETURN jsonb_build_object('error', 'No active players available');
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


-- ═══════════════════════════════════════════════════════════════════════════
-- CHECK COACH GUESS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION check_coach_guess(
  p_guess_id uuid,
  p_date_seed bigint,
  p_guess_number int
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_answer coaches%ROWTYPE;
  v_guess coaches%ROWTYPE;
  v_is_correct boolean;
  v_reveal boolean;
  v_cells jsonb;
  v_result jsonb;
  v_name_status text;
  v_nat_status text;
  v_club_status text;
  v_league_status text;
  v_age_status text; v_age_arrow text;
BEGIN
  -- Resolve today's answer (same logic as get_daily_coach)
  SELECT c.* INTO v_answer FROM coaches c
  WHERE c.id = (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (ORDER BY id) as rn, COUNT(*) OVER () as total
      FROM coaches WHERE active = true
    ) ranked WHERE total > 0 AND rn = ((p_date_seed % total) + 1)
  );

  IF v_answer IS NULL THEN
    RETURN jsonb_build_object('error', 'No active coaches available');
  END IF;

  SELECT * INTO v_guess FROM coaches WHERE id = p_guess_id AND active = true;
  IF v_guess IS NULL THEN
    RETURN jsonb_build_object('error', 'Guessed coach not found');
  END IF;

  -- Name
  v_is_correct := lower(trim(v_guess.name)) = lower(trim(v_answer.name));
  v_name_status := CASE WHEN v_is_correct THEN 'exact' ELSE 'none' END;

  -- Nationality (close = same continent)
  IF v_guess.nationality IS NULL OR v_answer.nationality IS NULL THEN v_nat_status := 'none';
  ELSIF lower(trim(v_guess.nationality)) = lower(trim(v_answer.nationality)) THEN v_nat_status := 'exact';
  ELSIF v_guess.continent IS NOT NULL AND v_guess.continent = v_answer.continent THEN v_nat_status := 'close';
  ELSE v_nat_status := 'none'; END IF;

  -- Club (close = same league)
  IF v_guess.club IS NULL OR v_answer.club IS NULL THEN v_club_status := 'none';
  ELSIF lower(trim(v_guess.club)) = lower(trim(v_answer.club)) THEN v_club_status := 'exact';
  ELSIF v_guess.league IS NOT NULL AND lower(trim(v_guess.league)) = lower(trim(v_answer.league)) THEN v_club_status := 'close';
  ELSE v_club_status := 'none'; END IF;

  -- League (close = same nationality)
  IF v_guess.league IS NULL OR v_answer.league IS NULL THEN v_league_status := 'none';
  ELSIF lower(trim(v_guess.league)) = lower(trim(v_answer.league)) THEN v_league_status := 'exact';
  ELSIF v_guess.nationality IS NOT NULL AND lower(trim(v_guess.nationality)) = lower(trim(v_answer.nationality)) THEN v_league_status := 'close';
  ELSE v_league_status := 'none'; END IF;

  -- Age (close = within 2)
  IF v_guess.age IS NULL OR v_answer.age IS NULL THEN v_age_status := 'none'; v_age_arrow := NULL;
  ELSIF v_guess.age = v_answer.age THEN v_age_status := 'exact'; v_age_arrow := NULL;
  ELSE
    v_age_status := CASE WHEN abs(v_guess.age - v_answer.age) <= 2 THEN 'close' ELSE 'none' END;
    v_age_arrow := CASE WHEN v_answer.age > v_guess.age THEN 'up' ELSE 'down' END;
  END IF;

  v_cells := jsonb_build_object(
    'name', v_name_status,
    'nationality', v_nat_status,
    'club', v_club_status,
    'league', v_league_status,
    'age', jsonb_build_object('status', v_age_status, 'arrow', v_age_arrow)
  );

  v_reveal := v_is_correct OR p_guess_number >= 8;
  v_result := jsonb_build_object('cells', v_cells, 'is_correct', v_is_correct);

  IF v_reveal THEN
    v_result := v_result || jsonb_build_object('answer', row_to_json(v_answer)::jsonb);
  END IF;

  RETURN v_result;
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- CHECK TEAM GUESS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION check_team_guess(
  p_guess_id uuid,
  p_date_seed bigint,
  p_guess_number int
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_answer teams%ROWTYPE;
  v_guess teams%ROWTYPE;
  v_is_correct boolean;
  v_reveal boolean;
  v_cells jsonb;
  v_result jsonb;
  v_name_status text;
  v_league_status text;
  v_country_status text;
  v_ovr_status text; v_ovr_arrow text;
  v_stadium_status text;
  v_def_status text;
  v_off_status text;
BEGIN
  -- Resolve today's answer (same logic as get_daily_team)
  SELECT t.* INTO v_answer FROM teams t
  WHERE t.id = (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (ORDER BY id) as rn, COUNT(*) OVER () as total
      FROM teams WHERE active = true
    ) ranked WHERE total > 0 AND rn = ((p_date_seed % total) + 1)
  );

  IF v_answer IS NULL THEN
    RETURN jsonb_build_object('error', 'No active teams available');
  END IF;

  SELECT * INTO v_guess FROM teams WHERE id = p_guess_id AND active = true;
  IF v_guess IS NULL THEN
    RETURN jsonb_build_object('error', 'Guessed team not found');
  END IF;

  -- Name
  v_is_correct := lower(trim(v_guess.name)) = lower(trim(v_answer.name));
  v_name_status := CASE WHEN v_is_correct THEN 'exact' ELSE 'none' END;

  -- League (close = same country)
  IF v_guess.league IS NULL OR v_answer.league IS NULL THEN v_league_status := 'none';
  ELSIF lower(trim(v_guess.league)) = lower(trim(v_answer.league)) THEN v_league_status := 'exact';
  ELSIF v_guess.country IS NOT NULL AND lower(trim(v_guess.country)) = lower(trim(v_answer.country)) THEN v_league_status := 'close';
  ELSE v_league_status := 'none'; END IF;

  -- Country (close = same continent)
  IF v_guess.country IS NULL OR v_answer.country IS NULL THEN v_country_status := 'none';
  ELSIF lower(trim(v_guess.country)) = lower(trim(v_answer.country)) THEN v_country_status := 'exact';
  ELSIF _get_continent(v_guess.country) IS NOT NULL AND _get_continent(v_guess.country) = _get_continent(v_answer.country) THEN v_country_status := 'close';
  ELSE v_country_status := 'none'; END IF;

  -- Overall (close = within 3)
  IF v_guess.overall IS NULL OR v_answer.overall IS NULL THEN v_ovr_status := 'none'; v_ovr_arrow := NULL;
  ELSIF v_guess.overall = v_answer.overall THEN v_ovr_status := 'exact'; v_ovr_arrow := NULL;
  ELSE
    v_ovr_status := CASE WHEN abs(v_guess.overall - v_answer.overall) <= 3 THEN 'close' ELSE 'none' END;
    v_ovr_arrow := CASE WHEN v_answer.overall > v_guess.overall THEN 'up' ELSE 'down' END;
  END IF;

  -- Stadium (exact or none)
  IF v_guess.stadium IS NULL OR v_answer.stadium IS NULL THEN v_stadium_status := 'none';
  ELSIF lower(trim(v_guess.stadium)) = lower(trim(v_answer.stadium)) THEN v_stadium_status := 'exact';
  ELSE v_stadium_status := 'none'; END IF;

  -- Def style (exact or none)
  IF v_guess.def_style IS NULL OR v_answer.def_style IS NULL THEN v_def_status := 'none';
  ELSIF lower(trim(v_guess.def_style)) = lower(trim(v_answer.def_style)) THEN v_def_status := 'exact';
  ELSE v_def_status := 'none'; END IF;

  -- Off style (exact or none)
  IF v_guess.off_style IS NULL OR v_answer.off_style IS NULL THEN v_off_status := 'none';
  ELSIF lower(trim(v_guess.off_style)) = lower(trim(v_answer.off_style)) THEN v_off_status := 'exact';
  ELSE v_off_status := 'none'; END IF;

  v_cells := jsonb_build_object(
    'name', v_name_status,
    'league', v_league_status,
    'country', v_country_status,
    'overall', jsonb_build_object('status', v_ovr_status, 'arrow', v_ovr_arrow),
    'stadium', v_stadium_status,
    'defStyle', v_def_status,
    'offStyle', v_off_status
  );

  v_reveal := v_is_correct OR p_guess_number >= 8;
  v_result := jsonb_build_object('cells', v_cells, 'is_correct', v_is_correct);

  IF v_reveal THEN
    v_result := v_result || jsonb_build_object('answer', row_to_json(v_answer)::jsonb);
  END IF;

  RETURN v_result;
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- PERMISSIONS: Grant execute on new functions + fix rankings
-- ═══════════════════════════════════════════════════════════════════════════
GRANT EXECUTE ON FUNCTION check_player_guess TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_coach_guess TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_team_guess TO anon, authenticated;

-- Fix rankings: ensure game_history and profiles are readable for the 
-- record_game_result and get_rankings SECURITY DEFINER functions
GRANT SELECT, INSERT ON public.game_history TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
