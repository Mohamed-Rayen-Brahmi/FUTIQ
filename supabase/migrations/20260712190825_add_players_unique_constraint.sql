/*
# Add unique constraint on players (name, club)

1. Changes
- Add a UNIQUE constraint on `players(name, club)` so the player-sync edge function can upsert by this key.
- This ensures idempotent re-runs: the same player from the same club updates the existing row rather than creating duplicates.
*/

-- Drop first for idempotency
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_name_club_key;
ALTER TABLE players ADD CONSTRAINT players_name_club_key UNIQUE (name, club);
