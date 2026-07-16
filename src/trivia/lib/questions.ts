/**
 * Question generation for the Trivia Party mode.
 * Now uses a static list of handcrafted questions from questions.json.
 */

import type { Player } from '../../types/database';
import type { GeneratedQuestion, QuestionType } from '../types';
import { shuffle } from './decoys';
import questionsData from '../data/questions.json';

// Extended Player type
export interface TriviaPlayer extends Player {
  nickname: string | null;
  career_goals: number | null;
  career_assists: number | null;
  first_club: string | null;
  first_club_joined_date: string | null;
}

/**
 * Pick a random question from the JSON file that hasn't been used yet.
 * We no longer use 'player' as the subject, but we keep the signature
 * to avoid breaking the calling code in useTriviaSolo and useTriviaRoom.
 */
export function pickRoundQuestion(
  pool: TriviaPlayer[], // Kept for compatibility but unused
  usedQuestionIds: Set<string>, // Changed from Map to Set
): { player: TriviaPlayer; question: GeneratedQuestion } | null {
  
  // Cast JSON data to GeneratedQuestion[]
  const allQuestions = questionsData as GeneratedQuestion[];
  
  // Filter out used questions
  const available = allQuestions.filter(q => !usedQuestionIds.has(q.id!));
  if (available.length === 0) return null;

  // Pick a random question
  const shuffled = shuffle([...available]);
  const picked = shuffled[0];

  // We need to return a dummy player to satisfy the API
  const dummyPlayer = pool[0] || ({} as TriviaPlayer);

  return { player: dummyPlayer, question: picked };
}
