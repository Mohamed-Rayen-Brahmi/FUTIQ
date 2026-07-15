/*
# Add auto-profile trigger and get_random_player RPC

1. Trigger: handle_new_user
- A PL/pgSQL function that inserts a profiles row for a newly created auth.users row.
- Trigger fires AFTER INSERT on auth.users for each row.
- Idempotent: uses ON CONFLICT DO NOTHING so re-running is safe.

2. RPC: get_random_player
- Takes an optional exclude_player_id uuid (today's daily answer).
- Returns a single random active player row excluding that id.
- Server-side selection so the client never pulls a large player list.
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (NEW.id, split_part(NEW.email, '@', 1))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION get_random_player(exclude_player_id uuid DEFAULT NULL)
RETURNS players
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM players
  WHERE active = true
    AND (exclude_player_id IS NULL OR id <> exclude_player_id)
  ORDER BY random()
  LIMIT 1;
$$;
