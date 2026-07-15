import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Player, GuessRow, GameMode, GameStatus, CellStatus } from '../types/database';
import { MAX_GUESSES, getDailySeed } from '../lib/constants';
import { useAuth } from '../auth/AuthContext';
import { loadGuestState, updateGuestAfterGame, loadRoundState, saveRoundState, clearRoundState } from '../lib/guest';

// Daily and Training both cap at MAX_GUESSES; Unlimited has no cap.
function maxGuessesForMode(mode: GameMode): number | null {
  return mode === 'unlimited' ? null : MAX_GUESSES;
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

  // Select mystery player
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        let player: Player | null = null;

        if (mode === 'daily') {
          // Deterministic daily selection via date-seeded RPC
          const seed = getDailySeed();
          const { data, error: rpcError } = await supabase
            .rpc('get_daily_player', { date_seed: seed })
            .single();
          if (rpcError) throw rpcError;
          if (data) player = data as Player;
        } else {
          // Training / Unlimited: random player excluding today's daily answer
          const seed = getDailySeed();
          const { data: dailyData } = await supabase
            .rpc('get_daily_player', { date_seed: seed })
            .maybeSingle();
          const excludeId = (dailyData as Player | null)?.id || null;

          const { data, error: rpcError } = await supabase
            .rpc('get_random_player', { exclude_player_id: excludeId })
            .single();
          if (rpcError) throw rpcError;
          if (data) player = data as Player;
        }

        if (cancelled) return;

        if (!player) {
          setError('No players available. Run the player-sync function to populate the roster.');
          return;
        }

        setMysteryPlayer(player);

        // Try to restore in-progress round from localStorage
        const roundKey = `footdle:round:${mode}`;
        const saved = loadRoundState(roundKey);
        if (saved && saved.playerId === player.id) {
          setGuesses(saved.guesses);
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
  }, [mode, roundId]);

  const makeGuess = useCallback(async (guessPlayer: Player): Promise<boolean> => {
    if (!mysteryPlayer || status !== 'playing') return false;
    if (maxGuesses !== null && guesses.length >= maxGuesses) return false;

    const row = compareGuess(guessPlayer, mysteryPlayer);
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

    // Check win/loss (Unlimited mode has no guess cap, so it can only end by winning or giving up)
    const won = row.cells.name.status === 'exact';
    const lost = !won && maxGuesses !== null && newGuesses.length >= maxGuesses;
    const newStatus: GameStatus = won ? 'won' : lost ? 'lost' : 'playing';
    setStatus(newStatus);

    // Save round state
    const roundKey = `footdle:round:${mode}`;
    saveRoundState(roundKey, {
      playerId: mysteryPlayer.id,
      guesses: newGuesses,
      status: newStatus,
      unlockedStats: Array.from(newUnlocked),
    });

    // If game ended, record stats. Deliberately NOT clearing the saved round
    // state here — the finished board (revealed card, full guess grid) needs
    // to stay in storage so reopening the page restores it instead of
    // showing a blank round. It only gets cleared when the player explicitly
    // starts a new round via reset() ("Play Again"), or naturally stops
    // matching once a new mystery player is fetched (e.g. the next day's
    // Daily player).
    if (won || lost) {
      await recordGameResult(mode, mysteryPlayer.id, newGuesses.length, won, user, refreshProfile, setShowBanner);
    }

    return true;
  }, [mysteryPlayer, status, guesses, unlockedStats, mode, maxGuesses, user, profile, refreshProfile]);

  // Unlimited mode has no guess cap, so it needs an explicit way to end the round.
  const giveUp = useCallback(async () => {
    if (!mysteryPlayer || status !== 'playing') return;

    const newStatus: GameStatus = 'lost';
    setStatus(newStatus);

    // Save the finished round (same as a natural win/loss) instead of
    // clearing it, so reopening the page still shows the revealed answer
    // rather than a blank round.
    const roundKey = `footdle:round:${mode}`;
    saveRoundState(roundKey, {
      playerId: mysteryPlayer.id,
      guesses,
      status: newStatus,
      unlockedStats: Array.from(unlockedStats),
    });

    await recordGameResult(mode, mysteryPlayer.id, guesses.length, false, user, refreshProfile, setShowBanner);
  }, [mysteryPlayer, status, guesses, unlockedStats, mode, user, profile, refreshProfile]);

  const reset = useCallback(() => {
    const roundKey = `footdle:round:${mode}`;
    clearRoundState(roundKey);
    setGuesses([]);
    setStatus('playing');
    setUnlockedStats(new Set());
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
  user: { id: string } | null,
  refreshProfile: () => void,
  setShowBanner: (v: boolean) => void,
) {
  if (user) {
    // Logged in: the server computes the resulting streak/stats from the
    // currently stored values — the client only reports the round outcome,
    // it can no longer set the resulting numbers directly (see the
    // "secure_stat_writes" migration for why this changed).
    try {
      const { error } = await supabase.rpc('record_game_result', {
        p_player_id: playerId,
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
    // Guest: update localStorage
    updateGuestAfterGame(won, mode);
    const guest = loadGuestState();
    if (!guest.hasSeenBanner) setShowBanner(true);
  }
}
