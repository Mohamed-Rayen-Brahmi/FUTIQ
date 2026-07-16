export interface Player {
  id: string;
  name: string;
  nation: string | null;
  continent: string | null;
  club: string | null;
  league: string | null;
  position_code: string | null;
  position_group: string | null;
  age: number | null;
  birth_date: string | null;
  shirt_number: number | null;
  avatar_seed: string | null;
  club_primary_color: string | null;
  club_secondary_color: string | null;
  image_url: string | null;
  image_attribution: string | null;
  active: boolean;
  created_at: string;
  // Trivia enrichment columns (populated by scripts/sync-trivia-stats.mjs)
  nickname: string | null;
  career_goals: number | null;
  career_assists: number | null;
  first_club: string | null;
  first_club_joined_date: string | null;
  transfermarkt_id: string | null;
}

export interface Profile {
  id: string;
  username: string | null;
  streak: number;
  max_streak: number;
  games_played: number;
  games_won: number;
  created_at: string;
}

export interface GameHistory {
  id: string;
  user_id: string | null;
  player_id: string | null;
  guesses_used: number;
  won: boolean;
  played_at: string;
  players?: Pick<Player, 'name' | 'club' | 'league'> | null;
}

export type CardTier = 'gold' | 'gold-rare' | 'gold-totw';

export interface CardTierConfig {
  border: string;
  glow: string;
  gradient: string;
}

export const CARD_TIERS: Record<CardTier, CardTierConfig> = {
  gold: {
    border: '#d8b458',
    glow: 'rgba(216, 180, 88, 0.35)',
    gradient: 'linear-gradient(135deg, #1a1a1a 0%, #2a2210 50%, #1a1a1a 100%)',
  },
  'gold-rare': {
    border: '#e8c878',
    glow: 'rgba(232, 200, 120, 0.4)',
    gradient: 'linear-gradient(135deg, #1a1a1a 0%, #2a2818 50%, #1a1a1a 100%)',
  },
  'gold-totw': {
    border: '#3a3a3a',
    glow: 'rgba(120, 120, 120, 0.3)',
    gradient: 'linear-gradient(135deg, #1a1a1a 0%, #222 50%, #1a1a1a 100%)',
  },
};

export type CellStatus = 'exact' | 'close' | 'none';

export interface GuessCell {
  value: string;
  status: CellStatus;
  arrow?: 'up' | 'down' | null;
}

export interface GuessRow {
  player: Player;
  cells: {
    name: GuessCell;
    nation: GuessCell;
    league: GuessCell;
    club: GuessCell;
    position: GuessCell;
    age: GuessCell;
    shirt: GuessCell;
  };
}

export interface Coach {
  id: string;
  name: string;
  nationality: string | null;
  continent: string | null;
  club: string | null;
  league: string | null;
  age: number | null;
  dob: string | null;
  image_url: string | null;
  active: boolean;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  league: string | null;
  country: string | null;
  overall: number | null;
  attack: number | null;
  midfield: number | null;
  defence: number | null;
  stadium: string | null;
  def_style: string | null;
  off_style: string | null;
  image_url: string | null;
  active: boolean;
  created_at: string;
}

export interface CoachGuessRow {
  coach: Coach;
  cells: {
    name: GuessCell;
    nationality: GuessCell;
    club: GuessCell;
    league: GuessCell;
    age: GuessCell;
  };
}

export interface TeamGuessRow {
  team: Team;
  cells: {
    name: GuessCell;
    league: GuessCell;
    country: GuessCell;
    overall: GuessCell;
    stadium: GuessCell;
    defStyle: GuessCell;
    offStyle: GuessCell;
  };
}

export interface RankingRow {
  rank: number;
  user_id: string;
  username: string;
  wins: number;
  best_streak: number;
  total_score: number;
}

export type GameMode = 'daily' | 'unlimited' | 'coaches_daily' | 'teams_daily';
export type GameStatus = 'playing' | 'won' | 'lost';

export interface GuestState {
  streak: number;
  maxStreak: number;
  gamesPlayed: number;
  gamesWon: number;
  hasSeenBanner: boolean;
}

export const GUEST_KEY = 'footdle:guest';
export const ROUND_KEY_PREFIX = 'footdle:round';
