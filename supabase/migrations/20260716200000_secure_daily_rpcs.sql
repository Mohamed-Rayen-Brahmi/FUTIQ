-- 1. Revoke direct access to the full-row daily RPCs from public clients
REVOKE EXECUTE ON FUNCTION get_daily_player(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_daily_coach(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_daily_team(text) FROM PUBLIC, anon, authenticated;

-- 2. Create lean RPCs that only return the ID for exclusion logic in Unlimited mode
CREATE OR REPLACE FUNCTION get_daily_player_id(date_seed text)
RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Use setseed to pick a random player based on the date string
  PERFORM setseed(
    ('0.' || cast(abs(hashtext(date_seed)) as text))::double precision
  );
  
  SELECT id INTO v_id FROM players ORDER BY random() LIMIT 1;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_daily_coach_id(date_seed text)
RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  PERFORM setseed(
    ('0.' || cast(abs(hashtext(date_seed)) as text))::double precision
  );
  
  SELECT id INTO v_id FROM coaches ORDER BY random() LIMIT 1;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_daily_team_id(date_seed text)
RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  PERFORM setseed(
    ('0.' || cast(abs(hashtext(date_seed)) as text))::double precision
  );
  
  SELECT id INTO v_id FROM teams ORDER BY random() LIMIT 1;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant access to these lean RPCs
GRANT EXECUTE ON FUNCTION get_daily_player_id(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_daily_coach_id(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_daily_team_id(text) TO anon, authenticated;
