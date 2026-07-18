import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Player, GameStatus, WhoAmIChallenge } from '../types/database';
import { MAX_GUESSES, getDailySeed } from '../lib/constants';
import { useAuth } from '../auth/AuthContext';
import { loadGuestState, updateGuestAfterGame, loadRoundState, saveRoundState, logGuestGame } from '../lib/guest';
import { calculateScore } from '../lib/scoring';

export function useWhoAmIGame() {
  const { user, refreshProfile } = useAuth();
  const [challenge, setChallenge] = useState<WhoAmIChallenge | null>(null);
  const [guesses, setGuesses] = useState<{ player: Player; isCorrect: boolean }[]>([]);
  const [status, setStatus] = useState<GameStatus>('playing');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const maxGuesses = MAX_GUESSES;
  const [answerPlayer, setAnswerPlayer] = useState<Player | null>(null);

  // Initialize game
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const seed = getDailySeed();
        const roundKey = 'golazio:round:who_am_i_daily';
        const saved = loadRoundState(roundKey);
        
        // Fetch the daily challenge hints
        const { data: challengeData, error: rpcError } = await supabase.rpc('get_daily_who_am_i', { date_seed: seed });
        
        if (rpcError) throw rpcError;
        if (!challengeData) throw new Error('No challenge found');
        
        if (!cancelled) {
          setChallenge(challengeData as WhoAmIChallenge);
        }
        
        if (saved && saved.dateSeed === seed) {
          if (!cancelled) {
            setGuesses(saved.guesses as { player: Player; isCorrect: boolean }[]);
            setStatus(saved.status);
            if (saved.answer) {
              setAnswerPlayer(saved.answer as Player);
            }
          }
        } else {
          if (!cancelled) {
            setGuesses([]);
            setStatus('playing');
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load game');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const makeGuess = useCallback(async (guessPlayer: Player): Promise<boolean> => {
    if (status !== 'playing') return false;
    if (guesses.length >= maxGuesses) return false;

    const seed = getDailySeed();
    const guessNumber = guesses.length + 1;

    const { data, error: rpcError } = await supabase
      .rpc('check_who_am_i_guess', {
        p_guess_id: guessPlayer.id,
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

    const isCorrect = data.is_correct;
    const newGuesses = [...guesses, { player: guessPlayer, isCorrect }];
    setGuesses(newGuesses);

    const won = isCorrect;
    const lost = !won && newGuesses.length >= maxGuesses;
    const newStatus: GameStatus = won ? 'won' : lost ? 'lost' : 'playing';
    setStatus(newStatus);

    let revealedAnswer: Player | null = null;
    if (data.answer) {
      revealedAnswer = data.answer as Player;
      setAnswerPlayer(revealedAnswer);
    }

    // Save round state
    const roundKey = 'golazio:round:who_am_i_daily';
    saveRoundState(roundKey, {
      dateSeed: seed,
      guesses: newGuesses as any,
      status: newStatus,
      unlockedStats: [], // Not used for who am i
      answer: revealedAnswer || undefined,
    });

    if (won || lost) {
      // The entity ID is the challenge ID or the answer player ID.
      // We will use answer player ID so the constraints map neatly to players.
      const answerId = revealedAnswer?.id || guessPlayer.id;
      // Pass an empty Set for unlockedStats, who_am_i_daily scoring relies purely on guessesUsed for wins, and grants 0 for losses.
      const score = calculateScore('who_am_i_daily' as any, won, newGuesses.length, new Set());
      await recordGameResult('who_am_i_daily', answerId, newGuesses.length, won, score, user, refreshProfile, setShowBanner);
    }

    return true;
  }, [status, guesses, maxGuesses, user, refreshProfile]);

  return {
    challenge,
    guesses,
    status,
    loading,
    error,
    makeGuess,
    maxGuesses,
    showBanner,
    answerPlayer,
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
