/*
  # Add trigram index for substring player-name search

  1. Background
  - The autocomplete search now matches a query anywhere in the player's name
    (`ILIKE '%query%'`), not just as a prefix, so a search for "ronaldo" also
    finds "Cristiano Ronaldo".
  - The existing `text_pattern_ops` btree index only accelerates prefix
    matches (`ILIKE 'query%'`) and is not used for substring matches, which
    would otherwise fall back to a full table scan as the roster grows.

  2. Changes
  - Enable the `pg_trgm` extension.
  - Add a GIN trigram index on `players(name)` so `ILIKE '%query%'` stays
    fast at scale.
*/

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_players_name_trgm
  ON players USING GIN (name gin_trgm_ops);
