/**
 * Helper file to calculate game scores.
 * 
 * Rules:
 * 
 * 1. Player Daily:
 *  - Win on guess 1 = 800, guess 2 = 700, ..., guess 8 = 100
 *  - Loss = 5 points per unique green attribute (Nation, League, Club, Position, Age, Shirt)
 * 
 * 2. Coaches, Teams, Unlimited:
 *  - Win on guess 1 = 80, guess 2 = 70, ..., guess 8 = 10. Guess 9+ = 0.
 *  - Loss = 1 point per unique green attribute
 */

type GameType = 'daily' | 'unlimited' | 'coaches_daily' | 'teams_daily' | 'who_am_i_daily';

export function calculateScore(
  mode: GameType,
  won: boolean,
  guessesUsed: number,
  unlockedStats: Set<string>
): number {
  if (won) {
    if (mode === 'daily' || mode === 'who_am_i_daily') {
      // 800 down to 100
      const score = 900 - (guessesUsed * 100);
      return Math.max(100, score);
    } else {
      // 80 down to 10, then 0
      const score = 90 - (guessesUsed * 10);
      return Math.max(0, score);
    }
  } else {
    // Calculate partial points for unique green attributes
    const uniqueMatches = unlockedStats.size;
    if (mode === 'daily' || mode === 'who_am_i_daily') {
      return uniqueMatches * 5;
    } else {
      return uniqueMatches * 1;
    }
  }
}
