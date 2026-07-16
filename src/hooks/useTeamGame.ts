import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Team, TeamGuessRow, GameStatus, CellStatus } from '../types/database';
import { MAX_GUESSES, getDailySeed } from '../lib/constants';
import { useAuth } from '../auth/AuthContext';
import { loadGuestState, updateGuestAfterGame, loadRoundState, saveRoundState } from '../lib/guest';

export function useTeamGame() {
  const { user, profile, refreshProfile } = useAuth();
  const [mysteryTeam, setMysteryTeam] = useState<Team | null>(null);
  const [guesses, setGuesses] = useState<TeamGuessRow[]>([]);
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
        const roundKey = 'footdle:round:teams_daily';
        const saved = loadRoundState(roundKey);
        
        if (saved && saved.dateSeed === seed) {
          setGuesses(saved.guesses as unknown as TeamGuessRow[]);
          setStatus(saved.status);
          if (saved.unlockedStats) setUnlockedStats(new Set(saved.unlockedStats));
          if (saved.answer) {
            setMysteryTeam(saved.answer as Team);
          } else {
            // Fetch just the image for ongoing games
            const { data: imgUrl } = await supabase.rpc('get_daily_team_image', { date_seed: seed });
            setMysteryTeam({ image_url: imgUrl } as Team);
          }
        } else {
          setGuesses([]);
          setStatus('playing');
          setUnlockedStats(new Set());
          // Fetch just the image for new games
          const { data: imgUrl } = await supabase.rpc('get_daily_team_image', { date_seed: seed });
          setMysteryTeam({ image_url: imgUrl } as Team);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load game');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const makeGuess = useCallback(async (guessTeam: Team): Promise<boolean> => {
    if (status !== 'playing') return false;
    if (guesses.length >= maxGuesses) return false;

    const seed = getDailySeed();
    const guessNumber = guesses.length + 1;

    const { data, error: rpcError } = await supabase
      .rpc('check_team_guess', {
        p_guess_id: guessTeam.id,
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
    const row: TeamGuessRow = {
      team: guessTeam,
      cells: {
        name: { value: guessTeam.name, status: cells.name as CellStatus },
        league: { value: guessTeam.league || '??', status: cells.league as CellStatus },
        country: { value: guessTeam.country || '??', status: cells.country as CellStatus },
        overall: { value: String(guessTeam.overall ?? '??'), status: cells.overall.status as CellStatus, arrow: cells.overall.arrow as 'up' | 'down' | null },
        stadium: { value: guessTeam.stadium || '??', status: cells.stadium as CellStatus },
        defStyle: { value: guessTeam.def_style || '??', status: cells.defStyle as CellStatus },
        offStyle: { value: guessTeam.off_style || '??', status: cells.offStyle as CellStatus },
      },
    };

    const newGuesses = [...guesses, row];
    setGuesses(newGuesses);

    // Update unlocked stats
    const newUnlocked = new Set(unlockedStats);
    if (row.cells.league.status === 'exact') newUnlocked.add('league');
    if (row.cells.country.status === 'exact') newUnlocked.add('country');
    if (row.cells.overall.status === 'exact') newUnlocked.add('overall');
    if (row.cells.stadium.status === 'exact') newUnlocked.add('stadium');
    if (row.cells.defStyle.status === 'exact') newUnlocked.add('defStyle');
    if (row.cells.offStyle.status === 'exact') newUnlocked.add('offStyle');
    setUnlockedStats(newUnlocked);

    const won = data.is_correct;
    const lost = !won && newGuesses.length >= maxGuesses;
    const newStatus: GameStatus = won ? 'won' : lost ? 'lost' : 'playing';
    setStatus(newStatus);

    let revealedAnswer: Team | null = null;
    if (data.answer) {
      revealedAnswer = data.answer as Team;
      setMysteryTeam(revealedAnswer);
    }

    // Save round state
    const roundKey = 'footdle:round:teams_daily';
    saveRoundState(roundKey, {
      dateSeed: seed,
      guesses: newGuesses as any,
      status: newStatus,
      unlockedStats: Array.from(newUnlocked),
      answer: revealedAnswer || undefined,
    });

    if (won || lost) {
      const answerId = revealedAnswer?.id || guessTeam.id;
      await recordGameResult('teams_daily', answerId, newGuesses.length, won, user, refreshProfile, setShowBanner);
    }

    return true;
  }, [status, guesses, unlockedStats, maxGuesses, user, refreshProfile]);

  return {
    mysteryTeam,
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
