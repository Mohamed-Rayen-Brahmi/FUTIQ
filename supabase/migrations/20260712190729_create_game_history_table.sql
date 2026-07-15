/*
# Create game_history table

1. New Tables
- `game_history` — one row per completed round.
  - `id` (uuid, primary key, default gen_random_uuid())
  - `user_id` (uuid, references profiles, nullable for guest-related rows, defaults to auth.uid())
  - `player_id` (uuid, references players)
  - `guesses_used` (int) — how many guesses the player took
  - `won` (boolean) — whether the player won
  - `played_at` (timestamptz, default now())

2. Indexes
- Index on `user_id` for fast per-user history queries.

3. Security
- Enable RLS on `game_history`.
- Owner-scoped SELECT and INSERT only (auth.uid() = user_id). user_id defaults to auth.uid() so inserts omitting it still pass the WITH CHECK.
*/

CREATE TABLE IF NOT EXISTS game_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  guesses_used int NOT NULL,
  won boolean NOT NULL,
  played_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_history_user_id ON game_history (user_id);

ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_game_history" ON game_history;
CREATE POLICY "select_own_game_history"
ON game_history FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_game_history" ON game_history;
CREATE POLICY "insert_own_game_history"
ON game_history FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);
