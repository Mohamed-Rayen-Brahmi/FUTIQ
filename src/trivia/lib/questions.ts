/**
 * Question generation for the Trivia Party mode.
 *
 * Given a subject player and the full player pool, produces a GeneratedQuestion.
 * Returns null when the required data field is absent (quiz skips those types).
 *
 * For types C (shirt_id) and D (same_nation), we also need other players from
 * the DB (passed in via `allPlayers`) so the question can reference a second
 * real player rather than inventing one.
 */

import type { Player } from '../../types/database';
import type { GeneratedQuestion, QuestionType } from '../types';
import { shuffle } from './decoys';

// Extended Player type including the new trivia columns added by migration
export interface TriviaPlayer extends Player {
  nickname: string | null;
  career_goals: number | null;
  career_assists: number | null;
  first_club: string | null;
  first_club_joined_date: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Question builders per type
// ─────────────────────────────────────────────────────────────────────────────

function buildNation(p: TriviaPlayer): GeneratedQuestion | null {
  if (!p.nation) return null;
  return {
    type: 'nation',
    text: `Which country does ${p.name} play for?`,
    real_answer: p.nation,
    subject_player_id: p.id,
  };
}

function buildClub(p: TriviaPlayer): GeneratedQuestion | null {
  if (!p.club) return null;
  return {
    type: 'club',
    text: `Which club does ${p.name} currently play for?`,
    real_answer: p.club,
    subject_player_id: p.id,
  };
}

function buildPosition(p: TriviaPlayer): GeneratedQuestion | null {
  if (!p.position_group) return null;
  return {
    type: 'position',
    text: `What position group does ${p.name} play in? (FWD / MID / DEF / GK)`,
    real_answer: p.position_group,
    subject_player_id: p.id,
  };
}

function buildShirtNumber(p: TriviaPlayer): GeneratedQuestion | null {
  if (!p.shirt_number) return null;
  return {
    type: 'shirt_number',
    text: `What shirt number does ${p.name} wear at ${p.club}?`,
    real_answer: String(p.shirt_number),
    subject_player_id: p.id,
  };
}

function buildAge(p: TriviaPlayer): GeneratedQuestion | null {
  if (!p.age) return null;
  return {
    type: 'age',
    text: `How old is ${p.name}?`,
    real_answer: String(p.age),
    subject_player_id: p.id,
  };
}

function buildContinent(p: TriviaPlayer): GeneratedQuestion | null {
  if (!p.continent) return null;
  return {
    type: 'continent',
    text: `Which continent is ${p.name} from?`,
    real_answer: p.continent,
    subject_player_id: p.id,
  };
}

function buildNickname(p: TriviaPlayer): GeneratedQuestion | null {
  if (!p.nickname) return null;
  return {
    type: 'nickname',
    text: `What is ${p.name}'s famous nickname?`,
    real_answer: p.nickname,
    subject_player_id: p.id,
  };
}

function buildCareerGoals(p: TriviaPlayer): GeneratedQuestion | null {
  if (p.career_goals == null) return null;
  return {
    type: 'career_goals',
    text: `How many career goals has ${p.name} scored?`,
    real_answer: String(p.career_goals),
    subject_player_id: p.id,
  };
}

function buildCareerAssists(p: TriviaPlayer): GeneratedQuestion | null {
  if (p.career_assists == null) return null;
  return {
    type: 'career_assists',
    text: `How many career assists has ${p.name} recorded?`,
    real_answer: String(p.career_assists),
    subject_player_id: p.id,
  };
}

function buildFirstClub(p: TriviaPlayer): GeneratedQuestion | null {
  if (!p.first_club) return null;
  return {
    type: 'first_club',
    text: `Which club did ${p.name} start their career at?`,
    real_answer: p.first_club,
    subject_player_id: p.id,
  };
}

function buildFirstClubYear(p: TriviaPlayer): GeneratedQuestion | null {
  if (!p.first_club_joined_date) return null;
  const year = p.first_club_joined_date.slice(0, 4);
  if (!year || year.length !== 4) return null;
  return {
    type: 'first_club_year',
    text: `What year did ${p.name} join their first club?`,
    real_answer: year,
    subject_player_id: p.id,
  };
}

/**
 * Type C — "Which [Club] player wears the #X shirt?"
 * We pick ANOTHER player from the same club (not the subject), then ask who
 * wears that shirt. The answer is a real player's name from the same squad.
 */
function buildShirtId(p: TriviaPlayer, allPlayers: TriviaPlayer[]): GeneratedQuestion | null {
  const clubmates = allPlayers.filter(
    q => q.id !== p.id && q.club === p.club && q.shirt_number != null && q.name,
  );
  if (clubmates.length === 0) return null;
  const target = clubmates[Math.floor(Math.random() * clubmates.length)];
  return {
    type: 'shirt_id',
    text: `Which ${p.club} player wears the #${target.shirt_number} shirt?`,
    real_answer: target.name,
    subject_player_id: p.id,
  };
}

/**
 * Type D — "Which player is from [Nation] like [Player]?"
 * Pick a second real player from the same nation (not the subject).
 * The bluff is to submit other real player names from different nations.
 */
function buildSameNation(p: TriviaPlayer, allPlayers: TriviaPlayer[]): GeneratedQuestion | null {
  if (!p.nation) return null;
  const compatriots = allPlayers.filter(
    q => q.id !== p.id && q.nation === p.nation && q.name,
  );
  if (compatriots.length === 0) return null;
  const target = compatriots[Math.floor(Math.random() * compatriots.length)];
  return {
    type: 'same_nation',
    text: `Which player is from ${p.nation} just like ${p.name}?`,
    real_answer: target.name,
    subject_player_id: p.id,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

const BUILDERS: ((p: TriviaPlayer, all: TriviaPlayer[]) => GeneratedQuestion | null)[] = [
  (p)       => buildNation(p),
  (p)       => buildClub(p),
  (p)       => buildPosition(p),
  (p)       => buildShirtNumber(p),
  (p)       => buildAge(p),
  (p)       => buildContinent(p),
  (p)       => buildNickname(p),
  (p)       => buildCareerGoals(p),
  (p)       => buildCareerAssists(p),
  (p)       => buildFirstClub(p),
  (p)       => buildFirstClubYear(p),
  (p, all)  => buildShirtId(p, all),
  (p, all)  => buildSameNation(p, all),
];

/**
 * Try question types in random order and return the first viable one
 * that isn't in the `usedTypes` set.
 */
export function generateQuestion(
  player: TriviaPlayer,
  allPlayers: TriviaPlayer[],
  usedTypes: Set<QuestionType>,
): GeneratedQuestion | null {
  const shuffledBuilders = shuffle([...BUILDERS]);
  for (const builder of shuffledBuilders) {
    const q = builder(player, allPlayers);
    if (!q) continue;
    if (usedTypes.has(q.type)) continue;
    return q;
  }
  return null;
}

/**
 * Pick a random subject player from the pool, pick a question for them,
 * and return both. Used during solo and multiplayer round setup.
 *
 * Excludes players already used for the given type in this session
 * (`usedPairs` maps player_id → Set of used question types).
 */
export function pickRoundQuestion(
  pool: TriviaPlayer[],
  usedPairs: Map<string, Set<QuestionType>>,
): { player: TriviaPlayer; question: GeneratedQuestion } | null {
  const shuffled = shuffle([...pool]);
  for (const player of shuffled) {
    const usedTypes = usedPairs.get(player.id) ?? new Set();
    const q = generateQuestion(player, pool, usedTypes);
    if (q) return { player, question: q };
  }
  return null;
}
