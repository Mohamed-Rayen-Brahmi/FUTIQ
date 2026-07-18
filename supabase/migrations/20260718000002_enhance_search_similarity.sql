-- ============================================================
-- Enhance Search with pg_trgm similarity
-- This allows matching "Kevin De Bruyne" to "K. De Bruyne"
-- by comparing the similarity of the strings.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Set a reasonable similarity threshold
-- 0.2 allows partial matches like "Kevin De Bruyne" to "K. De Bruyne"
SET pg_trgm.similarity_threshold = 0.2;

-- 1. Search Players
CREATE OR REPLACE FUNCTION search_players(search_query text)
RETURNS SETOF players
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM players
  WHERE active = true
    AND (
      unaccent(name) ILIKE unaccent('%' || search_query || '%')
      OR similarity(unaccent(name), unaccent(search_query)) > 0.2
    )
  ORDER BY 
    -- prioritize exact substring matches, then highest similarity
    (unaccent(name) ILIKE unaccent('%' || search_query || '%')) DESC,
    similarity(unaccent(name), unaccent(search_query)) DESC,
    name ASC
  LIMIT 10;
$$;

GRANT EXECUTE ON FUNCTION search_players(text) TO anon, authenticated;

-- 2. Search All Players (including inactive)
CREATE OR REPLACE FUNCTION search_all_players(search_query text)
RETURNS SETOF players
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM players
  WHERE (
      unaccent(name) ILIKE unaccent('%' || search_query || '%')
      OR similarity(unaccent(name), unaccent(search_query)) > 0.2
    )
  ORDER BY 
    (unaccent(name) ILIKE unaccent('%' || search_query || '%')) DESC,
    similarity(unaccent(name), unaccent(search_query)) DESC,
    active DESC,
    name ASC
  LIMIT 10;
$$;

-- 3. Search Coaches
CREATE OR REPLACE FUNCTION search_coaches(search_query text)
RETURNS SETOF coaches
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM coaches
  WHERE active = true
    AND (
      unaccent(name) ILIKE unaccent('%' || search_query || '%')
      OR similarity(unaccent(name), unaccent(search_query)) > 0.2
    )
  ORDER BY 
    (unaccent(name) ILIKE unaccent('%' || search_query || '%')) DESC,
    similarity(unaccent(name), unaccent(search_query)) DESC,
    name ASC
  LIMIT 10;
$$;

-- 4. Search Teams
CREATE OR REPLACE FUNCTION search_teams(search_query text)
RETURNS SETOF teams
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM teams
  WHERE active = true
    AND (
      unaccent(name) ILIKE unaccent('%' || search_query || '%')
      OR similarity(unaccent(name), unaccent(search_query)) > 0.2
    )
  ORDER BY 
    (unaccent(name) ILIKE unaccent('%' || search_query || '%')) DESC,
    similarity(unaccent(name), unaccent(search_query)) DESC,
    name ASC
  LIMIT 10;
$$;
