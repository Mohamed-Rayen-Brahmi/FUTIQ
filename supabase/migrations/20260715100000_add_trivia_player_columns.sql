/*
  # Add trivia enrichment columns to players table

  New nullable columns for the Trivia Party game mode question bank.
  The sync script (scripts/sync-trivia-stats.mjs) populates these from
  the Transfermarkt-Datasets open dataset.

  Quiz logic skips any question type whose required column is null —
  partial coverage is fine and doesn't break anything.
*/

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS nickname text,
  ADD COLUMN IF NOT EXISTS career_goals int,
  ADD COLUMN IF NOT EXISTS career_assists int,
  ADD COLUMN IF NOT EXISTS first_club text,
  ADD COLUMN IF NOT EXISTS first_club_joined_date date,
  -- Used as join key for future re-syncs without name-collision risk
  ADD COLUMN IF NOT EXISTS transfermarkt_id text;

CREATE INDEX IF NOT EXISTS idx_players_transfermarkt_id ON players (transfermarkt_id)
  WHERE transfermarkt_id IS NOT NULL;
