import type { GuestState, GuessRow, GameStatus, GameMode } from '../types/database';
import { GUEST_KEY } from '../types/database';
import { supabase } from './supabase';
import { readPersisted, writePersisted, clearPersisted, readLocal, writeLocal, clearLocal } from './storage';

export function loadGuestState(): GuestState {
  try {
    const raw = readPersisted(GUEST_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GuestState;
      return {
        streak: parsed.streak || 0,
        maxStreak: parsed.maxStreak || 0,
        gamesPlayed: parsed.gamesPlayed || 0,
        gamesWon: parsed.gamesWon || 0,
        hasSeenBanner: parsed.hasSeenBanner || false,
      };
    }
  } catch {
    // ignore parse errors
  }
  return { streak: 0, maxStreak: 0, gamesPlayed: 0, gamesWon: 0, hasSeenBanner: false };
}

export function saveGuestState(state: GuestState): void {
  writePersisted(GUEST_KEY, JSON.stringify(state));
}

export interface GuestGameLog {
  playerId: string;
  guessesUsed: number;
  won: boolean;
  mode: string;
  score: number;
}

const GUEST_HISTORY_KEY = 'golazio:guest_history';

export function loadGuestHistory(): GuestGameLog[] {
  try {
    const raw = readPersisted(GUEST_HISTORY_KEY);
    if (raw) return JSON.parse(raw) as GuestGameLog[];
  } catch {
    // ignore
  }
  return [];
}

export function logGuestGame(log: GuestGameLog): void {
  const history = loadGuestHistory();
  history.push(log);
  writePersisted(GUEST_HISTORY_KEY, JSON.stringify(history));
}

export function clearGuestHistory(): void {
  clearPersisted(GUEST_HISTORY_KEY);
}

export function updateGuestAfterGame(won: boolean, mode: GameMode = 'daily'): GuestState {
  // Re-read right before writing (rather than trusting a value the caller
  // might have loaded earlier) so a win/loss can never clobber progress that
  // was written a moment before from another tab or an earlier point in the
  // same round.
  const state = loadGuestState();
  // Unlimited mode has no guess cap and no natural pass/fail outcome, so by
  // default it counts toward games played but NOT toward streak, to avoid
  // streak inflation. Daily and Training both count toward streak as before.
  const countsTowardStreak = mode !== 'unlimited';
  const newStreak = countsTowardStreak ? (won ? state.streak + 1 : 0) : state.streak;
  const newState: GuestState = {
    ...state,
    streak: newStreak,
    maxStreak: Math.max(state.maxStreak, newStreak),
    gamesPlayed: state.gamesPlayed + 1,
    gamesWon: state.gamesWon + (won ? 1 : 0),
  };
  saveGuestState(newState);
  return newState;
}

interface RoundState {
  playerId?: string;
  dateSeed?: number;
  guesses: any[];
  status: GameStatus;
  unlockedStats: string[];
  answer?: any;
}

export function loadRoundState(key: string): RoundState | null {
  try {
    const raw = readLocal(key);
    if (raw) return JSON.parse(raw) as RoundState;
  } catch {
    // ignore
  }
  return null;
}

export function saveRoundState(key: string, state: RoundState): void {
  writeLocal(key, JSON.stringify(state));
}

export function clearRoundState(key: string): void {
  clearLocal(key);
}

export async function migrateGuestToAccount(userId: string): Promise<void> {
  const guest = loadGuestState();
  if (guest.gamesPlayed === 0) return; // nothing to migrate

  try {
    // The profile row is created by a DB trigger on signup, which can lag
    // slightly behind the client receiving the new session. Retry a few
    // times instead of giving up immediately, so a fast signup->migration
    // sequence doesn't silently skip merging guest progress.
    let profileExists = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
      if (data) {
        profileExists = true;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    if (!profileExists) return; // Never found a profile row — leave guest data intact, try again next login.

    // We no longer call merge_guest_stats because AuthContext iterates over guestHistory
    // and calls record_game_result for each game, which naturally increments games_played,
    // games_won, and correctly tracks streak and max_streak!

    // Clear guest cache
    clearPersisted(GUEST_KEY);
  } catch (err) {
    console.error('Guest migration failed:', err);
  }
}
