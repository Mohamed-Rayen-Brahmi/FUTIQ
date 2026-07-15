import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Coach, CoachGuessRow, GameStatus, CellStatus } from '../types/database';
import { MAX_GUESSES, getDailySeed } from '../lib/constants';
import { useAuth } from '../auth/AuthContext';
import { loadGuestState, updateGuestAfterGame, loadRoundState, saveRoundState } from '../lib/guest';

export function useCoachGame() {
  const { user, profile, refreshProfile } = useAuth();
  const [mysteryCoach, setMysteryCoach] = useState<Coach | null>(null);
  const [guesses, setGuesses] = useState<CoachGuessRow[]>([]);
  const [status, setStatus] = useState<GameStatus>('playing');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlockedStats, setUnlockedStats] = useState<Set<string>>(new Set());
  const [showBanner, setShowBanner] = useState(false);
  const maxGuesses = MAX_GUESSES;

  // Fetch mystery coach
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const seed = getDailySeed();
        const { data, error: rpcError } = await supabase
          .rpc('get_daily_coach', { date_seed: seed })
          .single();
        if (rpcError) throw rpcError;

        if (cancelled) return;

        if (!data) {
          setError('No coaches available.');
          return;
        }

        const coach = data as Coach;
        setMysteryCoach(coach);

        // Restore in-progress round
        const roundKey = 'footdle:round:coaches_daily';
        const saved = loadRoundState(roundKey);
        if (saved && saved.playerId === coach.id) {
          setGuesses(saved.guesses as unknown as CoachGuessRow[]);
          setStatus(saved.status);
          if (saved.unlockedStats) setUnlockedStats(new Set(saved.unlockedStats));
        } else {
          setGuesses([]);
          setStatus('playing');
          setUnlockedStats(new Set());
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load game');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const makeGuess = useCallback(async (guessCoach: Coach): Promise<boolean> => {
    if (!mysteryCoach || status !== 'playing') return false;
    if (guesses.length >= maxGuesses) return false;

    const row = compareCoachGuess(guessCoach, mysteryCoach);
    const newGuesses = [...guesses, row];
    setGuesses(newGuesses);

    // Update unlocked stats
    const newUnlocked = new Set(unlockedStats);
    if (row.cells.nationality.status === 'exact') newUnlocked.add('nationality');
    if (row.cells.club.status === 'exact') newUnlocked.add('club');
    if (row.cells.league.status === 'exact') newUnlocked.add('league');
    if (row.cells.age.status === 'exact') newUnlocked.add('age');
    setUnlockedStats(newUnlocked);

    // Check win/loss
    const won = row.cells.name.status === 'exact';
    const lost = !won && newGuesses.length >= maxGuesses;
    const newStatus: GameStatus = won ? 'won' : lost ? 'lost' : 'playing';
    setStatus(newStatus);

    // Save round state
    const roundKey = 'footdle:round:coaches_daily';
    saveRoundState(roundKey, {
      playerId: mysteryCoach.id,
      guesses: newGuesses as any,
      status: newStatus,
      unlockedStats: Array.from(newUnlocked),
    });

    if (won || lost) {
      await recordGameResult('coaches_daily', mysteryCoach.id, newGuesses.length, won, user, refreshProfile, setShowBanner);
    }

    return true;
  }, [mysteryCoach, status, guesses, unlockedStats, maxGuesses, user, refreshProfile]);

  return {
    mysteryCoach,
    guesses,
    status,
    loading,
    error,
    makeGuess,
    maxGuesses,
    showBanner,
    unlockedStats,
  };
}

function compareCoachGuess(guess: Coach, answer: Coach): CoachGuessRow {
  const nameStatus: CellStatus = guess.name.toLowerCase().trim() === answer.name.toLowerCase().trim() ? 'exact' : 'none';

  const nationalityStatus: CellStatus = compareWithClose(
    guess.nationality, answer.nationality,
    () => guess.continent === answer.continent && guess.continent !== null,
  );

  const clubStatus: CellStatus = compareWithClose(
    guess.club, answer.club,
    () => guess.league === answer.league && guess.league !== null,
  );

  const leagueStatus: CellStatus = compareWithClose(
    guess.league, answer.league,
    () => guess.nationality === answer.nationality && guess.nationality !== null,
  );

  const ageResult = compareNumber(guess.age, answer.age, 2);

  return {
    coach: guess,
    cells: {
      name: { value: guess.name, status: nameStatus },
      nationality: { value: guess.nationality || '??', status: nationalityStatus },
      club: { value: guess.club || '??', status: clubStatus },
      league: { value: guess.league || '??', status: leagueStatus },
      age: { value: String(guess.age ?? '??'), status: ageResult.status, arrow: ageResult.arrow },
    },
  };
}

function compareWithClose(
  guess: string | null,
  answer: string | null,
  closeCheck: () => boolean,
): CellStatus {
  if (!guess || !answer) return 'none';
  if (guess.toLowerCase().trim() === answer.toLowerCase().trim()) return 'exact';
  return closeCheck() ? 'close' : 'none';
}

function compareNumber(guess: number | null, answer: number | null, closeThreshold: number): { status: CellStatus; arrow: 'up' | 'down' | null } {
  if (guess == null || answer == null) return { status: 'none', arrow: null };
  if (guess === answer) return { status: 'exact', arrow: null };
  const diff = Math.abs(guess - answer);
  const status: CellStatus = diff <= closeThreshold ? 'close' : 'none';
  const arrow: 'up' | 'down' = answer > guess ? 'up' : 'down';
  return { status, arrow };
}

async function recordGameResult(
  mode: string,
  entityId: string,
  guessesUsed: number,
  won: boolean,
  user: { id: string } | null,
  refreshProfile: () => void,
  setShowBanner: (v: boolean) => void,
) {
  if (user) {
    try {
      const { error } = await supabase.rpc('record_game_result', {
        p_player_id: entityId,
        p_guesses_used: guessesUsed,
        p_won: won,
        p_mode: mode,
      });
      if (error) throw error;
      refreshProfile();
    } catch (err) {
      console.error('Failed to record game result:', err);
    }
  } else {
    updateGuestAfterGame(won, mode as any);
    const guest = loadGuestState();
    if (!guest.hasSeenBanner) setShowBanner(true);
  }
}
