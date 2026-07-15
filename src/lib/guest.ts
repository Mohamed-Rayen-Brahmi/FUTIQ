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
  playerId: string;
  guesses: GuessRow[];
  status: GameStatus;
  unlockedStats: string[];
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

    // Server decides whether this is actually a fresh account to merge
    // into (and clamps the values) — the client can no longer just push
    // arbitrary numbers, see the "secure_stat_writes" migration.
    const { error } = await supabase.rpc('merge_guest_stats', {
      p_games_played: guest.gamesPlayed,
      p_games_won: guest.gamesWon,
      p_streak: guest.streak,
      p_max_streak: guest.maxStreak,
    });
    if (error) throw error;

    // Clear guest cache
    clearPersisted(GUEST_KEY);
  } catch (err) {
    console.error('Guest migration failed:', err);
  }
}
