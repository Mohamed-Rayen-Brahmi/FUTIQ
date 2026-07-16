-- drop_old_functions.sql

DROP FUNCTION IF EXISTS get_daily_player_image(integer);
DROP FUNCTION IF EXISTS get_daily_coach_image(integer);
DROP FUNCTION IF EXISTS get_daily_team_image(integer);

NOTIFY pgrst, 'reload schema';
