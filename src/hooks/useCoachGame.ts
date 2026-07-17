import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Coach, CoachGuessRow, GameStatus, CellStatus } from '../types/database';
import { MAX_GUESSES, getDailySeed } from '../lib/constants';
import { useAuth } from '../auth/AuthContext';
import { loadGuestState, updateGuestAfterGame, loadRoundState, saveRoundState, clearRoundState, logGuestGame } from '../lib/guest';
import { calculateScore } from '../lib/scoring';

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

  // Initialize game
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const seed = getDailySeed();
        const roundKey = 'golazio:round:coaches_daily';
        const saved = loadRoundState(roundKey);
        
        if (saved && saved.dateSeed === seed) {
          setGuesses(saved.guesses as unknown as CoachGuessRow[]);
          setStatus(saved.status);
          if (saved.unlockedStats) setUnlockedStats(new Set(saved.unlockedStats));
          if (saved.answer) {
            setMysteryCoach(saved.answer as Coach);
          } else {
            // Fetch just the image for ongoing games
            const { data: imgUrl } = await supabase.rpc('get_daily_coach_image', { date_seed: seed });
            setMysteryCoach({ image_url: imgUrl } as Coach);
          }
        } else {
          setGuesses([]);
          setStatus('playing');
          setUnlockedStats(new Set());
          // Fetch just the image for new games
          const { data: imgUrl } = await supabase.rpc('get_daily_coach_image', { date_seed: seed });
          setMysteryCoach({ image_url: imgUrl } as Coach);
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
    if (status !== 'playing') return false;
    if (guesses.length >= maxGuesses) return false;

    const seed = getDailySeed();
    const guessNumber = guesses.length + 1;

    const { data, error: rpcError } = await supabase
      .rpc('check_coach_guess', {
        p_guess_id: guessCoach.id,
        p_date_seed: seed,
        p_guess_number: guessNumber,
      });

    if (rpcError) {
      console.error('Server check failed:', rpcError);
      return false;
    }

    if (data?.error) {
      console.error('Server check error:', data.error);
      return false;
    }

    const cells = data.cells;
    const row: CoachGuessRow = {
      coach: guessCoach,
      cells: {
        name: { value: guessCoach.name, status: cells.name as CellStatus },
        nationality: { value: guessCoach.nationality || '??', status: cells.nationality as CellStatus },
        club: { value: guessCoach.club || '??', status: cells.club as CellStatus },
        league: { value: guessCoach.league || '??', status: cells.league as CellStatus },
        age: { value: String(guessCoach.age ?? '??'), status: cells.age.status as CellStatus, arrow: cells.age.arrow as 'up' | 'down' | null },
      },
    };

    const newGuesses = [...guesses, row];
    setGuesses(newGuesses);

    // Update unlocked stats
    const newUnlocked = new Set(unlockedStats);
    if (row.cells.nationality.status === 'exact') newUnlocked.add('nationality');
    if (row.cells.club.status === 'exact') newUnlocked.add('club');
    if (row.cells.league.status === 'exact') newUnlocked.add('league');
    if (row.cells.age.status === 'exact') newUnlocked.add('age');
    setUnlockedStats(newUnlocked);

    const won = data.is_correct;
    const lost = !won && newGuesses.length >= maxGuesses;
    const newStatus: GameStatus = won ? 'won' : lost ? 'lost' : 'playing';
    setStatus(newStatus);

    let revealedAnswer: Coach | null = null;
    if (data.answer) {
      revealedAnswer = data.answer as Coach;
      setMysteryCoach(revealedAnswer);
    }

    // Save round state
    const roundKey = 'golazio:round:coaches_daily';
    saveRoundState(roundKey, {
      dateSeed: seed,
      guesses: newGuesses as any,
      status: newStatus,
      unlockedStats: Array.from(newUnlocked),
      answer: revealedAnswer || undefined,
    });

    if (won || lost) {
      const answerId = revealedAnswer?.id || guessCoach.id;
      const score = calculateScore('coaches_daily', won, newGuesses.length, newUnlocked);
      await recordGameResult('coaches_daily', answerId, newGuesses.length, won, score, user, refreshProfile, setShowBanner);
    }

    return true;
  }, [status, guesses, unlockedStats, maxGuesses, user, refreshProfile]);

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

async function recordGameResult(
  mode: string,
  entityId: string,
  guessesUsed: number,
  won: boolean,
  score: number,
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
        p_score: score,
      });
      if (error) throw error;
      refreshProfile();
    } catch (err) {
      console.error('Failed to record game result:', err);
    }
  } else {
    updateGuestAfterGame(won, mode as any);
    logGuestGame({ playerId: entityId, guessesUsed, won, mode, score });
    const guest = loadGuestState();
    if (!guest.hasSeenBanner) setShowBanner(true);
  }
}
