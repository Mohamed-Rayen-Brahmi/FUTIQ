-- 20260716_server_side_images.sql

-- Player Image
CREATE OR REPLACE FUNCTION get_daily_player_image(date_seed integer)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_image_url text;
BEGIN
  SELECT image_url INTO v_image_url
  FROM players
  WHERE id = (
    SELECT id
    FROM players
    ORDER BY (id::text || date_seed::text) COLLATE "C"
    LIMIT 1
  );
  
  RETURN v_image_url;
END;
$$;

-- Coach Image
CREATE OR REPLACE FUNCTION get_daily_coach_image(date_seed integer)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_image_url text;
BEGIN
  SELECT image_url INTO v_image_url
  FROM coaches
  WHERE id = (
    SELECT id
    FROM coaches
    ORDER BY (id::text || date_seed::text) COLLATE "C"
    LIMIT 1
  );
  
  RETURN v_image_url;
END;
$$;

-- Team Image
CREATE OR REPLACE FUNCTION get_daily_team_image(date_seed integer)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_image_url text;
BEGIN
  SELECT image_url INTO v_image_url
  FROM teams
  WHERE id = (
    SELECT id
    FROM teams
    ORDER BY (id::text || date_seed::text) COLLATE "C"
    LIMIT 1
  );
  
  RETURN v_image_url;
END;
$$;

-- Grant permissions to both anonymous and authenticated users
GRANT EXECUTE ON FUNCTION get_daily_player_image(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_daily_coach_image(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_daily_team_image(integer) TO anon, authenticated;
