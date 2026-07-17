# Implementation Plan: Fix Guest Sync, Prevent Double Points, and Improve Game Over Modal

## 1. Prevent Double-Scoring Exploit & Fix Guest Sync
**The Issue:** Guest points are lost on signup because they are only added to `profiles.games_won` and not `game_history`, which is what the leaderboard uses to calculate scores. Furthermore, the user correctly pointed out an exploit: someone could play on PC, then play as a guest on their phone, log in, and double-count the same daily game.

**The Fix:**
- **Database:** Create a migration to add a partial unique index on `game_history`:
  `CREATE UNIQUE INDEX unique_daily_game ON game_history (user_id, player_id, mode) WHERE mode IN ('daily', 'coaches_daily', 'teams_daily');`
- Update the `record_game_result` RPC to use `INSERT ... ON CONFLICT DO NOTHING`. If a duplicate is detected (e.g., trying to submit the same daily game twice), it will silently ignore the second submission and not add points to the profile. This closes the exploit.
- **Client:** Update `src/lib/guest.ts` to log every completed game into an array (`guestHistory`) in localStorage.
- Update `AuthContext.tsx` so that immediately after signup/login, it loops through the `guestHistory` array and calls `record_game_result` for each game. The unique constraint will ensure they get the points if it's their first time playing that daily game, but will block it if they already played it on another device!

## 2. Fix GameOver Modal Visibility
**The Issue:** The modal doesn't appear for Coaches and Teams because it's not imported. It also disappears permanently if you refresh the page after completing a game.

**The Fix:**
- Refactor `GameOverModal.tsx` to accept `Player`, `Coach`, or `Team` objects and render the correct card (`PlayerCard`, `CoachCard`, `TeamCard`).
- Implement the modal in `CoachGame.tsx` and `TeamGame.tsx`.
- In all three game components, add a floating "View Results" button that appears when the game is over (won or lost). This allows the user to re-open the modal at any time if they closed it or refreshed the page.

## 3. Add Win Animation
**The Fix:**
- Update `GameOverModal.tsx` to trigger a festive CSS animation (bouncing text, glowing borders, and floating emojis) when `status === 'won'`.

## User Review Required
> [!IMPORTANT]
> The unique constraint means that for any daily mode, an account can only EVER have one score per puzzle. If a user plays as a guest on their phone, logs in, and their account *already* has a score for today's puzzle (because they played on PC), the guest score will be rejected. This exactly matches your requested anti-exploit behavior.

Please click **Approve** if this plan looks good to you, and I will execute it immediately!
