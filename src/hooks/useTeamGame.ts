import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Team, TeamGuessRow, GameStatus, CellStatus } from '../types/database';
import { MAX_GUESSES, getDailySeed } from '../lib/constants';
import { useAuth } from '../auth/AuthContext';
import { loadGuestState, updateGuestAfterGame, loadRoundState, saveRoundState } from '../lib/guest';

// Simple continent map for country -> continent close matching
const COUNTRY_CONTINENTS: Record<string, string> = {
  // Europe
  'England': 'Europe', 'Spain': 'Europe', 'Germany': 'Europe', 'France': 'Europe',
  'Italy': 'Europe', 'Portugal': 'Europe', 'Netherlands': 'Europe', 'Belgium': 'Europe',
  'Scotland': 'Europe', 'Turkey': 'Europe', 'Austria': 'Europe', 'Switzerland': 'Europe',
  'Denmark': 'Europe', 'Norway': 'Europe', 'Sweden': 'Europe', 'Poland': 'Europe',
  'Czech Republic': 'Europe', 'Greece': 'Europe', 'Croatia': 'Europe', 'Serbia': 'Europe',
  'Romania': 'Europe', 'Ukraine': 'Europe', 'Russia': 'Europe', 'Ireland': 'Europe',
  'Wales': 'Europe', 'Hungary': 'Europe', 'Finland': 'Europe', 'Slovakia': 'Europe',
  'Slovenia': 'Europe', 'Bulgaria': 'Europe', 'Cyprus': 'Europe',
  // South America
  'Brazil': 'South America', 'Argentina': 'South America', 'Colombia': 'South America',
  'Chile': 'South America', 'Uruguay': 'South America', 'Paraguay': 'South America',
  'Peru': 'South America', 'Ecuador': 'South America', 'Venezuela': 'South America',
  'Bolivia': 'South America',
  // North America
  'United States': 'North America', 'Mexico': 'North America', 'Canada': 'North America',
  'Costa Rica': 'North America', 'Honduras': 'North America', 'Jamaica': 'North America',
  // Asia
  'Japan': 'Asia', 'South Korea': 'Asia', 'China': 'Asia', 'Saudi Arabia': 'Asia',
  'UAE': 'Asia', 'India': 'Asia', 'Thailand': 'Asia', 'Australia': 'Oceania',
  'Qatar': 'Asia', 'Iran': 'Asia',
  // Africa
  'South Africa': 'Africa', 'Egypt': 'Africa', 'Nigeria': 'Africa', 'Morocco': 'Africa',
  'Tunisia': 'Africa', 'Algeria': 'Africa', 'Ghana': 'Africa', 'Cameroon': 'Africa',
  'Senegal': 'Africa', 'Ivory Coast': 'Africa',
};

function getContinent(country: string | null): string | null {
  if (!country) return null;
  return COUNTRY_CONTINENTS[country] || null;
}

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

  // Fetch mystery team
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const seed = getDailySeed();
        const { data, error: rpcError } = await supabase
          .rpc('get_daily_team', { date_seed: seed })
          .single();
        if (rpcError) throw rpcError;

        if (cancelled) return;

        if (!data) {
          setError('No teams available.');
          return;
        }

        const team = data as Team;
        setMysteryTeam(team);

        // Restore in-progress round
        const roundKey = 'footdle:round:teams_daily';
        const saved = loadRoundState(roundKey);
        if (saved && saved.playerId === team.id) {
          setGuesses(saved.guesses as unknown as TeamGuessRow[]);
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

  const makeGuess = useCallback(async (guessTeam: Team): Promise<boolean> => {
    if (!mysteryTeam || status !== 'playing') return false;
    if (guesses.length >= maxGuesses) return false;

    const row = compareTeamGuess(guessTeam, mysteryTeam);
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

    // Check win/loss
    const won = row.cells.name.status === 'exact';
    const lost = !won && newGuesses.length >= maxGuesses;
    const newStatus: GameStatus = won ? 'won' : lost ? 'lost' : 'playing';
    setStatus(newStatus);

    // Save round state
    const roundKey = 'footdle:round:teams_daily';
    saveRoundState(roundKey, {
      playerId: mysteryTeam.id,
      guesses: newGuesses as any,
      status: newStatus,
      unlockedStats: Array.from(newUnlocked),
    });

    if (won || lost) {
      await recordGameResult('teams_daily', mysteryTeam.id, newGuesses.length, won, user, refreshProfile, setShowBanner);
    }

    return true;
  }, [mysteryTeam, status, guesses, unlockedStats, maxGuesses, user, refreshProfile]);

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

function compareTeamGuess(guess: Team, answer: Team): TeamGuessRow {
  const nameStatus: CellStatus = guess.name.toLowerCase().trim() === answer.name.toLowerCase().trim() ? 'exact' : 'none';

  const leagueStatus: CellStatus = compareWithClose(
    guess.league, answer.league,
    () => guess.country === answer.country && guess.country !== null,
  );

  const countryStatus: CellStatus = compareWithClose(
    guess.country, answer.country,
    () => {
      const gc = getContinent(guess.country);
      const ac = getContinent(answer.country);
      return gc !== null && gc === ac;
    },
  );

  const overallResult = compareNumber(guess.overall, answer.overall, 3);

  const stadiumStatus: CellStatus = compareExact(guess.stadium, answer.stadium);
  const defStyleStatus: CellStatus = compareExact(guess.def_style, answer.def_style);
  const offStyleStatus: CellStatus = compareExact(guess.off_style, answer.off_style);

  return {
    team: guess,
    cells: {
      name: { value: guess.name, status: nameStatus },
      league: { value: guess.league || '??', status: leagueStatus },
      country: { value: guess.country || '??', status: countryStatus },
      overall: { value: String(guess.overall ?? '??'), status: overallResult.status, arrow: overallResult.arrow },
      stadium: { value: guess.stadium || '??', status: stadiumStatus },
      defStyle: { value: guess.def_style || '??', status: defStyleStatus },
      offStyle: { value: guess.off_style || '??', status: offStyleStatus },
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

function compareExact(guess: string | null, answer: string | null): CellStatus {
  if (!guess || !answer) return 'none';
  return guess.toLowerCase().trim() === answer.toLowerCase().trim() ? 'exact' : 'none';
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
