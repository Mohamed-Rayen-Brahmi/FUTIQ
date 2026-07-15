/*
# Create profiles table

1. New Tables
- `profiles` — 1:1 with `auth.users`. Stores per-user game stats.
  - `id` (uuid, primary key, references auth.users ON DELETE CASCADE)
  - `username` (text) — display name
  - `streak` (int, default 0) — current win streak
  - `max_streak` (int, default 0) — best streak ever
  - `games_played` (int, default 0)
  - `games_won` (int, default 0)
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `profiles`.
- Owner-scoped SELECT and UPDATE only (auth.uid() = id). No client INSERT (rows are auto-created by trigger) or DELETE.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  streak int NOT NULL DEFAULT 0,
  max_streak int NOT NULL DEFAULT 0,
  games_played int NOT NULL DEFAULT 0,
  games_won int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile"
ON profiles FOR SELECT
TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile"
ON profiles FOR UPDATE
TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
