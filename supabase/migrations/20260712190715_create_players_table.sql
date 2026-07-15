/*
# Create players table

1. New Tables
- `players` — stores the full footballer roster used by the game.
  - `id` (uuid, primary key, default gen_random_uuid())
  - `name` (text, not null) — player display name
  - `nation` (text) — nationality string
  - `continent` (text) — continent of the nation (used for "close" matching)
  - `club` (text) — current club name
  - `league` (text) — league the club plays in
  - `position_code` (text) — e.g. "ST", "CAM", "GK"
  - `position_group` (text) — e.g. "FWD", "MID", "DEF", "GK"
  - `age` (int, nullable) — computed from birth_date
  - `birth_date` (date, nullable) — used to keep age current
  - `shirt_number` (int, nullable)
  - `avatar_seed` (text) — deterministic seed for the illustrated SVG fallback
  - `club_primary_color` (text, hex) — jersey primary color
  - `club_secondary_color` (text, hex) — jersey secondary color
  - `image_url` (text, nullable) — Wikidata/Commons photo URL, auto-populated by sync, never auto-overwritten
  - `image_attribution` (text, nullable) — license/credit string for the photo
  - `active` (boolean, default true) — whether the player is currently selectable
  - `created_at` (timestamptz, default now())

2. Indexes
- Composite index on `(active, name)` for fast filtered autocomplete search at scale.
- `text_pattern_ops` btree index on `name` to support `ILIKE 'prefix%'` queries efficiently.

3. Security
- Enable RLS on `players`.
- Public read-only: SELECT for `anon, authenticated`. No client writes.
*/

CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  nation text,
  continent text,
  club text,
  league text,
  position_code text,
  position_group text,
  age int,
  birth_date date,
  shirt_number int,
  avatar_seed text,
  club_primary_color text,
  club_secondary_color text,
  image_url text,
  image_attribution text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_players_active_name ON players (active, name);
CREATE INDEX IF NOT EXISTS idx_players_name_pattern ON players (name text_pattern_ops);

ALTER TABLE players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_players" ON players;
CREATE POLICY "public_read_players"
ON players FOR SELECT
TO anon, authenticated USING (true);
