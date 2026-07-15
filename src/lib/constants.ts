import type { CellStatus } from '../types/database';

export const POSITION_GROUPS: Record<string, string> = {
  GK: 'GK',
  RB: 'DEF', LB: 'DEF', CB: 'DEF', DF: 'DEF', RWB: 'DEF', LWB: 'DEF',
  CM: 'MID', CDM: 'MID', CAM: 'MID', RM: 'MID', LM: 'MID', MF: 'MID',
  RW: 'FWD', LW: 'FWD', ST: 'FWD', CF: 'FWD', FW: 'FWD', WF: 'FWD',
};

export function getPositionGroup(code: string | null): string | null {
  if (!code) return null;
  return POSITION_GROUPS[code] || null;
}

export function compareExact(guess: string | null, answer: string | null): CellStatus {
  if (!guess || !answer) return 'none';
  return guess.toLowerCase().trim() === answer.toLowerCase().trim() ? 'exact' : 'none';
}

export function compareClose(
  guess: string | null,
  answer: string | null,
  closeCheck: (g: string, a: string) => boolean,
): CellStatus {
  if (!guess || !answer) return 'none';
  if (guess.toLowerCase().trim() === answer.toLowerCase().trim()) return 'exact';
  return closeCheck(guess.toLowerCase().trim(), answer.toLowerCase().trim()) ? 'close' : 'none';
}

export function compareNumber(guess: number | null, answer: number | null): { status: CellStatus; arrow: 'up' | 'down' | null } {
  if (guess == null || answer == null) return { status: 'none', arrow: null };
  if (guess === answer) return { status: 'exact', arrow: null };
  const diff = Math.abs(guess - answer);
  const status: CellStatus = diff <= 2 ? 'close' : 'none';
  const arrow: 'up' | 'down' = answer > guess ? 'up' : 'down';
  return { status, arrow };
}

export function comparePosition(guessCode: string | null, answerCode: string | null): CellStatus {
  if (!guessCode || !answerCode) return 'none';
  if (guessCode === answerCode) return 'exact';
  const gGroup = getPositionGroup(guessCode);
  const aGroup = getPositionGroup(answerCode);
  return gGroup && aGroup && gGroup === aGroup ? 'close' : 'none';
}

export const MAX_GUESSES = 8;

// Deterministic daily player selection
export function getDailySeed(date: Date = new Date()): number {
  const utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return utc;
}

export function getDailyKey(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
