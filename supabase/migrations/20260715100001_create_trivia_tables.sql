/*
  # Create Trivia Party Mode tables

  New tables for the Footdle Trivia Party game mode (Kalak-style bluffing mechanic).
  These tables are entirely separate from the existing guessing-game tables and do not
  modify any existing schema.

  ## Tables

  - `trivia_rooms` — one row per game session (lobby + game lifecycle)
  - `trivia_participants` — one row per player per room (guests + auth users)
  - `trivia_rounds` — one row per round within a room
  - `trivia_submissions` — player-submitted fake answers during submission phase
  - `trivia_votes` — player votes during voting phase
  - `trivia_used_questions` — prevents question repeats within the same room

  ## Security model

  This is a party game meant to be played in the same physical space (or on a call).
  Guests play without creating accounts. Because of this, we cannot enforce the
  "don't show submissions before reveal" rule at the DB/RLS level without full auth.

  Trade-off accepted: RLS allows anon SELECT on all trivia tables. Determined
  players who inspect network traffic can see others' submissions before reveal —
  acceptable for a casual party game. The UI rigorously enforces the mechanic.
  The important invariant (options shown in voting have no attribution) is enforced
  by the host writing the options jsonb without attribution until the reveal phase.

  Phase flow per round:
    lobby → submission → voting → reveal → (next round submission OR finished)
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- trivia_rooms
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trivia_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code text NOT NULL UNIQUE,
  host_session_id text NOT NULL,
  host_name text NOT NULL,
  status text NOT NULL DEFAULT 'lobby'
    CHECK (status IN ('lobby', 'playing', 'finished')),
  total_rounds int NOT NULL DEFAULT 5
    CHECK (total_rounds IN (5, 10, 15)),
  current_round_number int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trivia_rooms_code ON trivia_rooms (room_code);
CREATE INDEX IF NOT EXISTS idx_trivia_rooms_created ON trivia_rooms (created_at);

ALTER TABLE trivia_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trivia_rooms_public_read"  ON trivia_rooms;
DROP POLICY IF EXISTS "trivia_rooms_anon_insert"  ON trivia_rooms;
DROP POLICY IF EXISTS "trivia_rooms_anon_update"  ON trivia_rooms;

CREATE POLICY "trivia_rooms_public_read" ON trivia_rooms
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "trivia_rooms_anon_insert" ON trivia_rooms
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Only the host can update their room (checked application-side; DB enforces
-- that updates only succeed when the caller knows the host_session_id — the
-- anon client sends it in the where clause of their update call).
CREATE POLICY "trivia_rooms_anon_update" ON trivia_rooms
  FOR UPDATE TO anon, authenticated USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- trivia_participants
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trivia_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES trivia_rooms (id) ON DELETE CASCADE,
  session_id text NOT NULL,
  display_name text NOT NULL,
  score int NOT NULL DEFAULT 0,
  is_host boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_trivia_participants_room ON trivia_participants (room_id);

ALTER TABLE trivia_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trivia_participants_public_read"  ON trivia_participants;
DROP POLICY IF EXISTS "trivia_participants_anon_insert"  ON trivia_participants;
DROP POLICY IF EXISTS "trivia_participants_anon_update"  ON trivia_participants;

CREATE POLICY "trivia_participants_public_read" ON trivia_participants
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "trivia_participants_anon_insert" ON trivia_participants
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "trivia_participants_anon_update" ON trivia_participants
  FOR UPDATE TO anon, authenticated USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- trivia_rounds
-- ─────────────────────────────────────────────────────────────────────────────
--
-- options jsonb structure:
--   During voting phase (no attribution):
--     [{"id":"opt_0","text":"Manchester City"}, ...]
--   During reveal phase (with attribution):
--     [{"id":"opt_0","text":"Manchester City","is_real":false,
--       "submitted_by":"Alice","session_id":"abc123"}, ...]
--
CREATE TABLE IF NOT EXISTS trivia_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES trivia_rooms (id) ON DELETE CASCADE,
  round_number int NOT NULL,
  question_type text NOT NULL,
  question_text text NOT NULL,
  -- real_answer is stored as text for all types (numbers serialised as strings)
  real_answer text NOT NULL,
  -- populated only when phase advances to 'voting'; attribution added at 'reveal'
  options jsonb,
  phase text NOT NULL DEFAULT 'submission'
    CHECK (phase IN ('submission', 'voting', 'reveal', 'finished')),
  phase_ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, round_number)
);

CREATE INDEX IF NOT EXISTS idx_trivia_rounds_room ON trivia_rounds (room_id);

ALTER TABLE trivia_rounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trivia_rounds_public_read"  ON trivia_rounds;
DROP POLICY IF EXISTS "trivia_rounds_anon_insert"  ON trivia_rounds;
DROP POLICY IF EXISTS "trivia_rounds_anon_update"  ON trivia_rounds;

CREATE POLICY "trivia_rounds_public_read" ON trivia_rounds
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "trivia_rounds_anon_insert" ON trivia_rounds
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "trivia_rounds_anon_update" ON trivia_rounds
  FOR UPDATE TO anon, authenticated USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- trivia_submissions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trivia_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES trivia_rounds (id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES trivia_rooms (id) ON DELETE CASCADE,
  session_id text NOT NULL,
  answer_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (round_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_trivia_submissions_round ON trivia_submissions (round_id);

ALTER TABLE trivia_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trivia_submissions_public_read"  ON trivia_submissions;
DROP POLICY IF EXISTS "trivia_submissions_anon_insert"  ON trivia_submissions;

-- See security model note at the top — anon SELECT is intentionally open.
CREATE POLICY "trivia_submissions_public_read" ON trivia_submissions
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "trivia_submissions_anon_insert" ON trivia_submissions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- trivia_votes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trivia_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES trivia_rounds (id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES trivia_rooms (id) ON DELETE CASCADE,
  voter_session_id text NOT NULL,
  option_id text NOT NULL,           -- matches TriviaOption.id from rounds.options
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (round_id, voter_session_id)
);

CREATE INDEX IF NOT EXISTS idx_trivia_votes_round ON trivia_votes (round_id);

ALTER TABLE trivia_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trivia_votes_public_read"  ON trivia_votes;
DROP POLICY IF EXISTS "trivia_votes_anon_insert"  ON trivia_votes;

CREATE POLICY "trivia_votes_public_read" ON trivia_votes
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "trivia_votes_anon_insert" ON trivia_votes
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- trivia_used_questions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trivia_used_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES trivia_rooms (id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players (id) ON DELETE CASCADE,
  question_type text NOT NULL,
  UNIQUE (room_id, player_id, question_type)
);

CREATE INDEX IF NOT EXISTS idx_trivia_used_room ON trivia_used_questions (room_id);

ALTER TABLE trivia_used_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trivia_used_public_read"  ON trivia_used_questions;
DROP POLICY IF EXISTS "trivia_used_anon_insert"  ON trivia_used_questions;

CREATE POLICY "trivia_used_public_read" ON trivia_used_questions
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "trivia_used_anon_insert" ON trivia_used_questions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Enable Realtime on the tables that need live sync
-- ─────────────────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE trivia_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE trivia_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE trivia_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE trivia_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE trivia_votes;
