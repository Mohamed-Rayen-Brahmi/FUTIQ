/*
  # Add coaches & teams tables, RPCs, and rankings

  1. New Tables
  - `coaches` — coaches dataset for the Coaches game mode
  - `teams`  — teams dataset for the Teams game mode

  2. New RPCs
  - get_daily_coach / get_random_coach / search_coaches
  - get_daily_team  / get_random_team  / search_teams
  - get_rankings(p_mode) — leaderboard query

  3. Alter game_history
  - Expand the mode CHECK to include 'coaches_daily' and 'teams_daily'

  4. Security
  - RLS enabled on both new tables with public read
  - GRANT SELECT to anon + authenticated
  - GRANT EXECUTE on all new functions to anon + authenticated
*/

-- Safe to re-run; no-ops if already present
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- coaches table
-- ============================================================
CREATE TABLE IF NOT EXISTS coaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  nationality text,
  continent text,
  club text,
  league text,
  age int,
  dob date,
  image_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE coaches
  ADD CONSTRAINT coaches_name_club_unique UNIQUE (name, club);

CREATE INDEX IF NOT EXISTS idx_coaches_name_trgm
  ON coaches USING GIN (name gin_trgm_ops);

ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_coaches" ON coaches;
CREATE POLICY "public_read_coaches"
  ON coaches FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================
-- teams table
-- ============================================================
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  league text,
  country text,
  overall int,
  attack int,
  midfield int,
  defence int,
  stadium text,
  def_style text,
  off_style text,
  image_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE teams
  ADD CONSTRAINT teams_name_unique UNIQUE (name);

CREATE INDEX IF NOT EXISTS idx_teams_name_trgm
  ON teams USING GIN (name gin_trgm_ops);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_teams" ON teams;
CREATE POLICY "public_read_teams"
  ON teams FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================
-- RPCs — coaches
-- ============================================================

-- Deterministic daily coach (same pattern as get_daily_player)
CREATE OR REPLACE FUNCTION get_daily_coach(date_seed bigint)
RETURNS coaches
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (ORDER BY id) as rn,
           COUNT(*) OVER () as total
    FROM coaches
    WHERE active = true
  )
  SELECT c.* FROM coaches c
  JOIN ranked r ON c.id = r.id
  WHERE r.rn = ((date_seed % r.total) + 1)
  LIMIT 1;
$$;

-- Random coach (same pattern as get_random_player)
CREATE OR REPLACE FUNCTION get_random_coach(exclude_coach_id uuid DEFAULT NULL)
RETURNS coaches
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM coaches
  WHERE active = true
    AND (exclude_coach_id IS NULL OR id <> exclude_coach_id)
  ORDER BY random()
  LIMIT 1;
$$;

-- Fuzzy search coaches (unaccent + ILIKE)
CREATE OR REPLACE FUNCTION search_coaches(search_query text)
RETURNS SETOF coaches
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM coaches
  WHERE active = true
    AND unaccent(name) ILIKE unaccent('%' || search_query || '%')
  ORDER BY name
  LIMIT 10;
$$;

-- ============================================================
-- RPCs — teams
-- ============================================================

-- Deterministic daily team (same pattern as get_daily_player)
CREATE OR REPLACE FUNCTION get_daily_team(date_seed bigint)
RETURNS teams
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (ORDER BY id) as rn,
           COUNT(*) OVER () as total
    FROM teams
    WHERE active = true
  )
  SELECT t.* FROM teams t
  JOIN ranked r ON t.id = r.id
  WHERE r.rn = ((date_seed % r.total) + 1)
  LIMIT 1;
$$;

-- Random team (same pattern as get_random_player)
CREATE OR REPLACE FUNCTION get_random_team(exclude_team_id uuid DEFAULT NULL)
RETURNS teams
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM teams
  WHERE active = true
    AND (exclude_team_id IS NULL OR id <> exclude_team_id)
  ORDER BY random()
  LIMIT 1;
$$;

-- Fuzzy search teams (unaccent + ILIKE)
CREATE OR REPLACE FUNCTION search_teams(search_query text)
RETURNS SETOF teams
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM teams
  WHERE active = true
    AND unaccent(name) ILIKE unaccent('%' || search_query || '%')
  ORDER BY name
  LIMIT 10;
$$;

-- ============================================================
-- get_rankings RPC
-- ============================================================

-- Custom composite type for ranking results
DO $$ BEGIN
  CREATE TYPE ranking_row AS (
    rank bigint,
    user_id uuid,
    username text,
    wins bigint,
    best_streak int
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION get_rankings(p_mode text)
RETURNS SETOF ranking_row
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY COUNT(*) FILTER (WHERE gh.won) DESC, p.max_streak DESC) as rank,
    p.id as user_id,
    p.username,
    COUNT(*) FILTER (WHERE gh.won) as wins,
    p.max_streak as best_streak
  FROM profiles p
  JOIN game_history gh ON gh.user_id = p.id
  WHERE gh.mode = p_mode
  GROUP BY p.id, p.username, p.max_streak
  HAVING COUNT(*) FILTER (WHERE gh.won) > 0
  ORDER BY wins DESC, best_streak DESC
  LIMIT 50;
$$;

-- ============================================================
-- Alter game_history — expand mode CHECK
-- ============================================================

-- Drop the old constraint, add the new one with coaches/teams modes
ALTER TABLE game_history
  DROP CONSTRAINT IF EXISTS game_history_mode_check;

ALTER TABLE game_history
  ADD CONSTRAINT game_history_mode_check
  CHECK (mode IN ('daily', 'training', 'unlimited', 'coaches_daily', 'teams_daily'));

-- ============================================================
-- Grants
-- ============================================================

GRANT SELECT ON coaches TO anon, authenticated;
GRANT SELECT ON teams   TO anon, authenticated;

GRANT EXECUTE ON FUNCTION get_daily_coach(bigint)        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_random_coach(uuid)         TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_coaches(text)           TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_daily_team(bigint)         TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_random_team(uuid)          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_teams(text)             TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_rankings(text)             TO anon, authenticated;
