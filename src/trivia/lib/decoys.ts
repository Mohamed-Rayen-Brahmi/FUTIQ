/**
 * Decoy generation for the Trivia Party mode.
 *
 * Quality bar: decoys must be GENUINELY PLAUSIBLE — never obviously wrong.
 * - Numeric questions: ±15–30% of the true value, unique values, never 0 or negative
 * - Text/categorical: drawn from curated real-world pools, never random strings
 * - No decoy ever duplicates the real answer
 *
 * All pools are statically embedded so this module has zero DB or network deps.
 * For question types where decoys should be real player names, callers supply
 * the pool from the players table (see `generatePlayerNameDecoys`).
 */

import type { QuestionType } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Curated static pools
// ─────────────────────────────────────────────────────────────────────────────

const FOOTBALL_NICKNAMES: string[] = [
  'The King', 'El Pibe de Oro', 'The Little Magician', 'CR7', 'La Pulga',
  'El Niño', 'The Galáctico', 'The Black Panther', 'The Wizard', 'Gattuso',
  'The Hawk', 'El Capitán', 'The Engine', 'El Matador', 'The General',
  'The Iceman', 'El Toro', 'The Professor', 'Golden Boy', 'The Magician',
  'The Prince', 'Bafana', 'El Fantasma', 'The Sniper', 'Il Fenomeno',
  'O Fenômeno', 'The Spider', 'The Shark', 'El Pistolero', 'The Tank',
  'Il Guerriero', 'The Fonz', 'El Nené', 'The Dog', 'The Destroyer',
  'O Rei', 'El Ángel', 'The Submarine', 'El Fideo', 'The Cobra',
];

/** Real club names by league era — used when asking about club-related facts. */
const CLUB_POOLS: Record<string, string[]> = {
  'Premier League': [
    'Arsenal', 'Chelsea', 'Liverpool', 'Manchester City', 'Manchester United',
    'Tottenham Hotspur', 'Newcastle United', 'Aston Villa', 'West Ham United',
    'Brighton & Hove Albion', 'Everton', 'Fulham', 'Brentford', 'Crystal Palace',
    'Leicester City', 'Leeds United', 'Wolverhampton Wanderers', 'Southampton',
    'Nottingham Forest', 'Burnley',
  ],
  'La Liga': [
    'Real Madrid', 'Barcelona', 'Atletico Madrid', 'Sevilla', 'Valencia',
    'Villarreal', 'Athletic Club', 'Real Sociedad', 'Betis', 'Celta Vigo',
    'Getafe', 'Osasuna', 'Mallorca', 'Las Palmas', 'Girona',
  ],
  'Serie A': [
    'Juventus', 'AC Milan', 'Inter Milan', 'Napoli', 'Roma', 'Lazio', 'Fiorentina',
    'Atalanta', 'Torino', 'Bologna', 'Udinese', 'Verona', 'Cagliari',
    'Genoa', 'Monza',
  ],
  'Bundesliga': [
    'Bayern Munich', 'Borussia Dortmund', 'RB Leipzig', 'Bayer Leverkusen',
    'Eintracht Frankfurt', 'VfB Stuttgart', 'Borussia Mönchengladbach',
    'Wolfsburg', 'Hoffenheim', 'Union Berlin', 'Werder Bremen', 'Augsburg',
  ],
  'Ligue 1': [
    'PSG', 'Marseille', 'Lyon', 'Monaco', 'Lille', 'Nice', 'Rennes',
    'Lens', 'Strasbourg', 'Nantes', 'Montpellier', 'Reims',
  ],
  'MLS': [
    'LA Galaxy', 'Inter Miami', 'LAFC', 'Seattle Sounders', 'Atlanta United',
    'NYC FC', 'Portland Timbers', 'Toronto FC', 'Red Bull New York',
    'Columbus Crew', 'Minnesota United', 'CF Montreal',
  ],
  'Saudi Pro League': [
    'Al Nassr', 'Al Hilal', 'Al Ahli', 'Al Ittihad', 'Al Shabab',
    'Al Qadsiah', 'Al Fateh', 'Al Taawoun', 'Al Wehda',
  ],
};

/** Historical first-club pool — real clubs known for large academies/early careers. */
const FIRST_CLUB_POOL: string[] = [
  'Sporting CP', 'SL Benfica', 'Ajax', 'Barcelona', 'Real Madrid',
  'Manchester United', 'Arsenal', 'Lyon', 'PSG', 'Juventus',
  'AC Milan', 'Inter Milan', 'Borussia Dortmund', 'Bayern Munich',
  'Liverpool', 'Santos', 'Flamengo', 'São Paulo', 'River Plate', 'Boca Juniors',
  'Independiente', 'Nacional', 'Peñarol', 'Estudiantes', 'Racing Club',
  'Anderlecht', 'Club Brugge', 'Olympiakos', 'CSKA Moscow', 'Shakhtar Donetsk',
  'Celtic', 'Rangers', 'Galatasaray', 'Fenerbahçe', 'Besiktas',
  'Aston Villa', 'Chelsea', 'West Ham United', 'Tottenham Hotspur',
  'CD Maldonado', 'CF Montreal', 'Chivas Guadalajara', 'América',
];

const NATIONS: string[] = [
  'England', 'France', 'Germany', 'Spain', 'Italy', 'Portugal', 'Brazil',
  'Argentina', 'Netherlands', 'Belgium', 'Croatia', 'Denmark', 'Sweden',
  'Norway', 'Switzerland', 'Austria', 'Poland', 'Serbia', 'Turkey',
  'Nigeria', 'Senegal', 'Ghana', 'Morocco', 'Algeria', 'Egypt', 'Ivory Coast',
  'USA', 'Canada', 'Mexico', 'Uruguay', 'Colombia', 'Japan', 'South Korea',
  'Australia', 'Saudi Arabia', 'Iran', 'Scotland', 'Wales',
];

const POSITION_GROUPS: string[] = ['FWD', 'MID', 'DEF', 'GK'];

const CONTINENTS: string[] = [
  'Europe', 'South America', 'Africa', 'North America', 'Asia', 'Oceania',
];

const FAMOUS_PLAYERS: string[] = [
  'Lionel Messi', 'Cristiano Ronaldo', 'Kylian Mbappe', 'Erling Haaland', 'Neymar',
  'Kevin De Bruyne', 'Robert Lewandowski', 'Luka Modric', 'Karim Benzema', 'Mohamed Salah',
  'Harry Kane', 'Zinedine Zidane', 'Ronaldinho', 'Ronaldo', 'Diego Maradona',
  'Pele', 'Thierry Henry', 'Wayne Rooney', 'Andres Iniesta', 'Xavi',
  'Sergio Ramos', 'Gianluigi Buffon', 'Iker Casillas', 'Manuel Neuer', 'Paolo Maldini',
  'Cafu', 'Roberto Carlos', 'Dani Alves', 'Marcelo', 'Toni Kroos',
  'Steven Gerrard', 'Frank Lampard', 'Paul Scholes', 'Ryan Giggs', 'Didier Drogba',
  'Zlatan Ibrahimovic', 'Luis Suarez', 'Sergio Aguero', 'Eden Hazard', 'Gareth Bale',
  'Angel Di Maria', 'Mesut Ozil', 'Cesc Fabregas', 'David Silva', 'Yaya Toure',
  'Vincent Kompany', 'John Terry', 'Rio Ferdinand', 'Nemanja Vidic', 'Gerard Pique',
  'Carles Puyol', 'Sergio Busquets', 'Casemiro', 'N\'Golo Kante', 'Andrea Pirlo',
  'Francesco Totti', 'Alessandro Del Piero', 'Roberto Baggio', 'Kaka', 'Rivaldo',
  'Romario', 'Gabriel Batistuta', 'Javier Zanetti', 'Fabio Cannavaro', 'Alessandro Nesta',
  'Ruud Gullit', 'Marco van Basten', 'Frank Rijkaard', 'Johan Cruyff', 'Michel Platini',
  'Luis Figo', 'Rui Costa', 'Deco', 'Clarence Seedorf', 'Edgar Davids',
  'Patrick Vieira', 'Claude Makelele', 'Roy Keane', 'David Beckham', 'Alan Shearer',
  'Eric Cantona', 'Dennis Bergkamp', 'Ian Wright', 'Michael Owen', 'Robbie Fowler',
  'Fernando Torres', 'David Villa', 'Raul', 'Samuel Eto\'o', 'Didier Deschamps',
];

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

/** Shuffle an array in-place using Fisher–Yates. */
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Pick N unique random items from an array, excluding the given values. */
function pickUnique(pool: string[], exclude: Set<string>, n: number): string[] {
  const filtered = pool.filter(v => !exclude.has(v));
  shuffle(filtered);
  return filtered.slice(0, n);
}

/**
 * Generate numeric decoys around a real numeric value.
 * - Never duplicates real answer or each other
 * - Never goes below 0
 * - For small values (<20): ±1-5 steps
 * - For medium (20-200): ±15% rounded to nearest integer
 * - For large (200+): ±20%
 */
function numericDecoys(real: number, count: number): string[] {
  const decoys = new Set<string>();
  const realStr = String(real);
  let attempts = 0;
  while (decoys.size < count && attempts < 200) {
    attempts++;
    let candidate: number;
    if (real < 20) {
      const step = Math.floor(Math.random() * 6) + 1;
      candidate = real + (Math.random() < 0.5 ? step : -step);
    } else if (real < 200) {
      const pct = 0.10 + Math.random() * 0.20; // 10–30%
      candidate = Math.round(real * (Math.random() < 0.5 ? 1 + pct : 1 - pct));
    } else {
      const pct = 0.12 + Math.random() * 0.18;
      candidate = Math.round(real * (Math.random() < 0.5 ? 1 + pct : 1 - pct));
    }
    if (candidate < 0) continue;
    const s = String(candidate);
    if (s !== realStr) decoys.add(s);
  }
  // Fallback: fill with sequential offsets if not enough variety
  for (let offset = 1; decoys.size < count; offset++) {
    const v = Math.max(0, real + offset);
    if (String(v) !== realStr) decoys.add(String(v));
  }
  return [...decoys].slice(0, count);
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface DecoysInput {
  questionType: QuestionType;
  realAnswer: string;
  count: number;
  /** League of the subject player (for club decoys). */
  league?: string | null;
  /** Pool of real player names from DB (for shirt_id / same_nation question types). */
  playerNamePool?: string[];
}

/** Returns exactly `count` plausible decoy strings. */
export function generateDecoys({
  questionType,
  realAnswer,
  count,
  league,
  playerNamePool = [],
}: DecoysInput): string[] {
  const exclude = new Set([realAnswer]);

  switch (questionType) {
    case 'nation':
      return pickUnique(NATIONS, exclude, count);

    case 'club': {
      // First try same-league clubs, then fall back to full pool
      const leagueClubs = (league && CLUB_POOLS[league]) ? CLUB_POOLS[league] : [];
      const allClubs    = [...new Set([...leagueClubs, ...Object.values(CLUB_POOLS).flat()])];
      return pickUnique(allClubs, exclude, count);
    }

    case 'position':
      return pickUnique(POSITION_GROUPS, exclude, count);

    case 'continent':
      return pickUnique(CONTINENTS, exclude, count);

    case 'nickname':
      return pickUnique(FOOTBALL_NICKNAMES, exclude, count);

    case 'first_club': {
      const allClubs = [...new Set([
        ...Object.values(CLUB_POOLS).flat(),
        ...FIRST_CLUB_POOL,
      ])];
      return pickUnique(allClubs, exclude, count);
    }

    case 'shirt_number': {
      const real = parseInt(realAnswer, 10);
      if (!Number.isNaN(real)) return numericDecoys(real, count);
      return pickUnique(['1','2','4','7','8','9','10','11'], exclude, count);
    }

    case 'age': {
      const real = parseInt(realAnswer, 10);
      return numericDecoys(Number.isNaN(real) ? 25 : real, count);
    }

    case 'career_goals': {
      const real = parseInt(realAnswer, 10);
      return numericDecoys(Number.isNaN(real) ? 50 : real, count);
    }

    case 'career_assists': {
      const real = parseInt(realAnswer, 10);
      return numericDecoys(Number.isNaN(real) ? 40 : real, count);
    }

    case 'first_club_year': {
      const real = parseInt(realAnswer, 10);
      if (!Number.isNaN(real)) {
        const decoys = new Set<string>();
        for (let i = 0; decoys.size < count; i++) {
          const offset = (Math.floor(Math.random() * 5) + 1) * (Math.random() < 0.5 ? 1 : -1);
          const y = String(real + offset);
          if (y !== realAnswer) decoys.add(y);
        }
        return [...decoys].slice(0, count);
      }
      return pickUnique(['2000','2001','2002','2003','2004','2005','2006'], exclude, count);
    }

    // Types C & D — answer is a player name; decoys are real player names from DB
    case 'shirt_id':
    case 'same_nation':
    case 'career_path':
    case 'international':
    case 'records':
    case 'ucl':
    case 'mixed': {
      // Some answers might be clubs or nations or numbers.
      const real = parseInt(realAnswer, 10);
      if (!Number.isNaN(real)) return numericDecoys(real, count);

      const allClubs = [...new Set([...Object.values(CLUB_POOLS).flat()])];
      if (allClubs.includes(realAnswer)) return pickUnique(allClubs, exclude, count);
      if (NATIONS.includes(realAnswer)) return pickUnique(NATIONS, exclude, count);

      // Default to picking player names
      const pool = [...new Set([...playerNamePool, ...FAMOUS_PLAYERS])].filter(n => !exclude.has(n));
      shuffle(pool);
      return pool.slice(0, count);
    }

    default:
      return pickUnique(playerNamePool.filter(n => !exclude.has(n)), exclude, count);
  }
}
