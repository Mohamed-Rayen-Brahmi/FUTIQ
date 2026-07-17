import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Player, GuessRow, GameMode, GameStatus, CellStatus } from '../types/database';
import { MAX_GUESSES, getDailySeed } from '../lib/constants';
import { useAuth } from '../auth/AuthContext';
import { loadGuestState, updateGuestAfterGame, loadRoundState, saveRoundState, clearRoundState, logGuestGame } from '../lib/guest';
import { calculateScore } from '../lib/scoring';

// Daily, Training, and Unlimited all cap at MAX_GUESSES (8).
function maxGuessesForMode(mode: GameMode): number | null {
  return MAX_GUESSES;
}

export function useGame(mode: GameMode) {
  const { user, profile, refreshProfile } = useAuth();
  const [mysteryPlayer, setMysteryPlayer] = useState<Player | null>(null);
  const [guesses, setGuesses] = useState<GuessRow[]>([]);
  const [status, setStatus] = useState<GameStatus>('playing');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlockedStats, setUnlockedStats] = useState<Set<string>>(new Set());
  const [showBanner, setShowBanner] = useState(false);
  const [roundId, setRoundId] = useState(0);
  const maxGuesses = maxGuessesForMode(mode);

  const isDaily = mode === 'daily';

  // ── Initialize game ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (isDaily) {
          // DAILY MODE: Server-side checking — do NOT fetch the answer.
          // Just restore saved round state if available.
          const seed = getDailySeed();
          const roundKey = `golazio:round:${mode}`;
          const saved = loadRoundState(roundKey);
          if (saved && saved.dateSeed === seed) {
            setGuesses(saved.guesses as GuessRow[]);
            setStatus(saved.status);
            if (saved.unlockedStats) setUnlockedStats(new Set(saved.unlockedStats));
            if (saved.answer) {
              setMysteryPlayer(saved.answer as Player);
            } else {
              // Fetch just the image for ongoing games
              const { data: imgUrl } = await supabase.rpc('get_daily_player_image', { date_seed: seed });
              setMysteryPlayer({ image_url: imgUrl } as Player);
            }
          } else {
            setGuesses([]);
            setStatus('playing');
            setUnlockedStats(new Set());
            // Fetch just the image for new games
            const { data: imgUrl } = await supabase.rpc('get_daily_player_image', { date_seed: seed });
            setMysteryPlayer({ image_url: imgUrl } as Player);
          }
        } else {
          // UNLIMITED MODE: Client-side comparison (practice, no rankings)
          const seed = getDailySeed();
          const { data: excludeId } = await supabase
            .rpc('get_daily_player_id', { date_seed: seed })
            .single();

          const { data, error: rpcError } = await supabase
            .rpc('get_random_player', { exclude_player_id: excludeId })
            .single();
          if (rpcError) throw rpcError;

          if (cancelled) return;

          if (!data) {
            setError('No players available.');
            return;
          }

          const player = data as Player;
          setMysteryPlayer(player);

          // Try to restore in-progress round from localStorage
          const roundKey = `golazio:round:${mode}`;
          const saved = loadRoundState(roundKey);
          if (saved && saved.playerId === player.id) {
            setGuesses(saved.guesses as GuessRow[]);
            setStatus(saved.status);
            if (saved.unlockedStats) setUnlockedStats(new Set(saved.unlockedStats));
          } else {
            setGuesses([]);
            setStatus('playing');
            setUnlockedStats(new Set());
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load game');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [mode, roundId]);

  // ── Make a guess ─────────────────────────────────────────────────────────
  const makeGuess = useCallback(async (guessPlayer: Player): Promise<boolean> => {
    if (status !== 'playing') return false;
    if (maxGuesses !== null && guesses.length >= maxGuesses) return false;

    if (isDaily) {
      // SERVER-SIDE CHECK: Call the secure RPC
      const seed = getDailySeed();
      const guessNumber = guesses.length + 1;

      const { data, error: rpcError } = await supabase
        .rpc('check_player_guess', {
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

      // Build GuessRow from server response
      const cells = data.cells;
      const row: GuessRow = {
        player: guessPlayer,
        cells: {
          name: { value: guessPlayer.name, status: cells.name as CellStatus },
          nation: { value: guessPlayer.nation || '??', status: cells.nation as CellStatus },
          league: { value: guessPlayer.league || '??', status: cells.league as CellStatus },
          club: { value: guessPlayer.club || '??', status: cells.club as CellStatus },
          position: { value: guessPlayer.position_code || '??', status: cells.position as CellStatus },
          age: { value: String(guessPlayer.age ?? '??'), status: cells.age.status as CellStatus, arrow: cells.age.arrow as 'up' | 'down' | null },
          shirt: { value: String(guessPlayer.shirt_number ?? '??'), status: cells.shirt.status as CellStatus, arrow: cells.shirt.arrow as 'up' | 'down' | null },
        },
      };

      const newGuesses = [...guesses, row];
      setGuesses(newGuesses);

      // Update unlocked stats
      const newUnlocked = new Set(unlockedStats);
      if (row.cells.nation.status === 'exact') newUnlocked.add('nation');
      if (row.cells.league.status === 'exact') newUnlocked.add('league');
      if (row.cells.club.status === 'exact') newUnlocked.add('club');
      if (row.cells.position.status === 'exact') newUnlocked.add('position');
      if (row.cells.age.status === 'exact') newUnlocked.add('age');
      if (row.cells.shirt.status === 'exact') newUnlocked.add('shirt');
      setUnlockedStats(newUnlocked);

      const won = data.is_correct;
      const lost = !won && newGuesses.length >= (maxGuesses ?? Infinity);
      const newStatus: GameStatus = won ? 'won' : lost ? 'lost' : 'playing';
      setStatus(newStatus);

      // If game over, set the revealed answer
      let revealedAnswer: Player | null = null;
      if (data.answer) {
        revealedAnswer = data.answer as Player;
        setMysteryPlayer(revealedAnswer);
      }

      // Save round state
      const roundKey = `golazio:round:${mode}`;
      saveRoundState(roundKey, {
        dateSeed: getDailySeed(),
        guesses: newGuesses,
        status: newStatus,
        unlockedStats: Array.from(newUnlocked),
        answer: revealedAnswer || undefined,
      });

      if (won || lost) {
        const answerId = revealedAnswer?.id || guessPlayer.id;
        const score = calculateScore(mode, won, newGuesses.length, newUnlocked);
        await recordGameResult(mode, answerId, newGuesses.length, won, score, user, refreshProfile, setShowBanner);
      }

      return true;
    } else {
      // UNLIMITED MODE: Client-side comparison (unchanged)
      if (!mysteryPlayer) return false;

      const row = compareGuess(guessPlayer, mysteryPlayer);
      const newGuesses = [...guesses, row];
      setGuesses(newGuesses);

      const newUnlocked = new Set(unlockedStats);
      if (row.cells.nation.status === 'exact') newUnlocked.add('nation');
      if (row.cells.league.status === 'exact') newUnlocked.add('league');
      if (row.cells.club.status === 'exact') newUnlocked.add('club');
      if (row.cells.position.status === 'exact') newUnlocked.add('position');
      if (row.cells.age.status === 'exact') newUnlocked.add('age');
      if (row.cells.shirt.status === 'exact') newUnlocked.add('shirt');
      setUnlockedStats(newUnlocked);

      const won = row.cells.name.status === 'exact';
      const lost = !won && maxGuesses !== null && newGuesses.length >= maxGuesses;
      const newStatus: GameStatus = won ? 'won' : lost ? 'lost' : 'playing';
      setStatus(newStatus);

      const roundKey = `golazio:round:${mode}`;
      saveRoundState(roundKey, {
        playerId: mysteryPlayer.id,
        guesses: newGuesses,
        status: newStatus,
        unlockedStats: Array.from(newUnlocked),
      });

      if (won || lost) {
        const score = calculateScore(mode, won, newGuesses.length, newUnlocked);
        await recordGameResult(mode, mysteryPlayer.id, newGuesses.length, won, score, user, refreshProfile, setShowBanner);
      }

      return true;
    }
  }, [mysteryPlayer, status, guesses, unlockedStats, mode, maxGuesses, isDaily, user, profile, refreshProfile]);

  const giveUp = useCallback(async () => {
    if (status !== 'playing') return;

    if (isDaily) {
      // For daily, we need to get the answer from the server
      const seed = getDailySeed();
      const { data } = await supabase
        .rpc('check_player_guess', {
          p_guess_id: guesses[0]?.player?.id || '00000000-0000-0000-0000-000000000000',
          p_date_seed: seed,
          p_guess_number: 8, // Force reveal
        });
      if (data?.answer) {
        setMysteryPlayer(data.answer as Player);
      }
    }

    const newStatus: GameStatus = 'lost';
    setStatus(newStatus);

    const roundKey = `golazio:round:${mode}`;
    saveRoundState(roundKey, {
      dateSeed: isDaily ? getDailySeed() : undefined,
      playerId: !isDaily ? mysteryPlayer?.id : undefined,
      guesses,
      status: newStatus,
      unlockedStats: Array.from(unlockedStats),
      answer: mysteryPlayer || undefined,
    });

    const entityId = mysteryPlayer?.id || '';
    if (entityId) {
      const score = calculateScore(mode, false, guesses.length, unlockedStats);
      await recordGameResult(mode, entityId, guesses.length, false, score, user, refreshProfile, setShowBanner);
    }
  }, [mysteryPlayer, status, guesses, unlockedStats, mode, isDaily, user, profile, refreshProfile]);

  const reset = useCallback(() => {
    const roundKey = `golazio:round:${mode}`;
    clearRoundState(roundKey);
    setGuesses([]);
    setStatus('playing');
    setUnlockedStats(new Set());
    setMysteryPlayer(null);
    setError(null);
    setRoundId(id => id + 1);
  }, [mode]);

  return {
    mysteryPlayer,
    guesses,
    status,
    loading,
    error,
    unlockedStats,
    showBanner,
    setShowBanner,
    makeGuess,
    giveUp,
    reset,
    maxGuesses,
  };
}

// ── Client-side comparison (used only by Unlimited mode) ─────────────────

function compareGuess(guess: Player, answer: Player): GuessRow {
  const nameStatus: CellStatus = guess.name.toLowerCase().trim() === answer.name.toLowerCase().trim() ? 'exact' : 'none';

  const nationStatus: CellStatus = compareWithClose(
    guess.nation, answer.nation,
    () => guess.continent === answer.continent && guess.continent !== null,
  );

  const leagueStatus: CellStatus = compareWithClose(
    guess.league, answer.league,
    () => guess.nation === answer.nation && guess.nation !== null,
  );

  const clubStatus: CellStatus = compareWithClose(
    guess.club, answer.club,
    () => guess.league === answer.league && guess.league !== null,
  );

  const positionStatus: CellStatus = comparePosition(guess.position_code, answer.position_code);

  const ageResult = compareNumber(guess.age, answer.age);
  const shirtResult = compareNumber(guess.shirt_number, answer.shirt_number);

  return {
    player: guess,
    cells: {
      name: { value: guess.name, status: nameStatus },
      nation: { value: guess.nation || '??', status: nationStatus },
      league: { value: guess.league || '??', status: leagueStatus },
      club: { value: guess.club || '??', status: clubStatus },
      position: { value: guess.position_code || '??', status: positionStatus },
      age: { value: String(guess.age ?? '??'), status: ageResult.status, arrow: ageResult.arrow },
      shirt: { value: String(guess.shirt_number ?? '??'), status: shirtResult.status, arrow: shirtResult.arrow },
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

function comparePosition(guessCode: string | null, answerCode: string | null): CellStatus {
  if (!guessCode || !answerCode) return 'none';
  if (guessCode === answerCode) return 'exact';
  const groups: Record<string, string> = {
    GK: 'GK', RB: 'DEF', LB: 'DEF', CB: 'DEF', DF: 'DEF', RWB: 'DEF', LWB: 'DEF',
    CM: 'MID', CDM: 'MID', CAM: 'MID', RM: 'MID', LM: 'MID', MF: 'MID',
    RW: 'FWD', LW: 'FWD', ST: 'FWD', CF: 'FWD', FW: 'FWD', WF: 'FWD',
  };
  const gGroup = groups[guessCode];
  const aGroup = groups[answerCode];
  return gGroup && aGroup && gGroup === aGroup ? 'close' : 'none';
}

function compareNumber(guess: number | null, answer: number | null): { status: CellStatus; arrow: 'up' | 'down' | null } {
  if (guess == null || answer == null) return { status: 'none', arrow: null };
  if (guess === answer) return { status: 'exact', arrow: null };
  const diff = Math.abs(guess - answer);
  const status: CellStatus = diff <= 2 ? 'close' : 'none';
  const arrow: 'up' | 'down' = answer > guess ? 'up' : 'down';
  return { status, arrow };
}

async function recordGameResult(
  mode: GameMode,
  playerId: string,
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
        p_player_id: playerId,
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
    updateGuestAfterGame(won, mode);
    logGuestGame({ playerId, guessesUsed, won, mode, score });
    const guest = loadGuestState();
    if (!guest.hasSeenBanner) setShowBanner(true);
  }
}
