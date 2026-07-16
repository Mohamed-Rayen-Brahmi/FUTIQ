// ─────────────────────────────────────────────────────────────────────────────
// Trivia Party Mode — TypeScript Types
// All types are scoped to src/trivia/ and have zero overlap with the existing
// guessing-game types in src/types/database.ts.
// ─────────────────────────────────────────────────────────────────────────────

export type TriviaPhase = 'submission' | 'voting' | 'reveal' | 'finished';

export type QuestionType =
  | 'nation'
  | 'club'
  | 'position'
  | 'shirt_number'
  | 'age'
  | 'continent'
  | 'nickname'
  | 'career_goals'
  | 'career_assists'
  | 'first_club'
  | 'first_club_year'
  | 'shirt_id'        // Type C: "Which [Club] player wears the #X shirt?"
  | 'same_nation'     // Type D: "Which player is from [Nation] like [Player]?"
  | 'career_path'
  | 'ucl'
  | 'records'
  | 'international'
  | 'mixed';

// ─────────────────────────────────────────────────────────────────────────────
// DB-backed entities (mirrors the SQL schema)
// ─────────────────────────────────────────────────────────────────────────────

export interface TriviaRoom {
  id: string;
  room_code: string;
  host_session_id: string;
  host_name: string;
  status: 'lobby' | 'playing' | 'finished';
  total_rounds: number;
  current_round_number: number;
  created_at: string;
}

export interface TriviaParticipant {
  id: string;
  room_id: string;
  session_id: string;
  display_name: string;
  score: number;
  is_host: boolean;
  joined_at: string;
  last_seen_at: string;
}

/** A single answer option shown on the voting screen. */
export interface TriviaOption {
  id: string;             // e.g. "opt_0" … "opt_7"
  text: string;
  // These fields are present only after the host reveals the round:
  is_real?: boolean;
  submitted_by?: string;  // display_name of the human submitter (null = system decoy)
  session_id?: string;    // session_id of the submitter (for scoring)
}

export interface TriviaRound {
  id: string;
  room_id: string;
  round_number: number;
  question_type: QuestionType;
  question_text: string;
  real_answer: string;
  options: TriviaOption[] | null; // null until voting phase starts
  phase: TriviaPhase;
  phase_ends_at: string | null;
  created_at: string;
}

export interface TriviaSubmission {
  id: string;
  round_id: string;
  room_id: string;
  session_id: string;
  answer_text: string;
  created_at: string;
}

export interface TriviaVote {
  id: string;
  round_id: string;
  room_id: string;
  voter_session_id: string;
  option_id: string;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Client-side game state (not persisted directly)
// ─────────────────────────────────────────────────────────────────────────────

export interface GeneratedQuestion {
  id?: string;
  type: QuestionType;
  text: string;
  real_answer: string;
  /** The subject player's id — stored in trivia_used_questions */
  subject_player_id: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Solo mode (entirely client-side, no DB required)
// ─────────────────────────────────────────────────────────────────────────────

export interface SoloOption {
  id: string;
  text: string;
  is_real: boolean;
}

export interface SoloQuestion {
  type: QuestionType;
  text: string;
  options: SoloOption[];  // already shuffled, 8 total
  real_answer: string;
}

export type SoloStatus = 'loading' | 'question' | 'revealed' | 'finished';

export interface SoloGameState {
  questions: SoloQuestion[];
  currentIndex: number;
  selectedOptionId: string | null;
  status: SoloStatus;
  score: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Round scoring result (computed client-side, then written to DB by host)
// ─────────────────────────────────────────────────────────────────────────────

export interface RoundScoreDelta {
  session_id: string;
  display_name: string;
  delta: number;
  /** Why they got points */
  reason: {
    guessed_correctly: boolean;
    fooled_count: number; // number of OTHER players who picked their fake
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Realtime broadcast event payloads (used in useTriviaRoom)
// ─────────────────────────────────────────────────────────────────────────────

export interface BroadcastPhaseChange {
  type: 'phase_change';
  new_phase: TriviaPhase;
  round_id: string;
}

export interface BroadcastSubmissionAck {
  type: 'submission_ack';
  session_id: string;   // not the answer — just "this player has submitted"
}
