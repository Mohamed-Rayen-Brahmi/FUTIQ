import { useState } from 'react';
import type { GameMode } from '../types/database';
import { useAuth } from '../auth/AuthContext';
import { loadGuestState } from '../lib/guest';
import { SkewButton, SkewBadge } from '../components/ui';
import { AdBanner } from '../components/AdBanner';
import { PlayerGame } from '../components/PlayerGame';
import { CoachGame } from '../components/CoachGame';
import { TeamGame } from '../components/TeamGame';

export function GamePage() {
  const [mode, setMode] = useState<GameMode>('daily');
  const { user, profile } = useAuth();

  const guestStats = user ? null : loadGuestState();

  const modeLabel = 
    mode === 'daily' ? 'Daily' : 
    mode === 'unlimited' ? 'Unlimited' : 
    mode === 'coaches_daily' ? 'Coaches' : 
    'Teams';

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Mode toggle */}
      <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
        <SkewButton
          variant={mode === 'daily' ? 'gold' : 'ghost'}
          size="sm"
          onClick={() => setMode('daily')}
        >
          Daily
        </SkewButton>
        <SkewButton
          variant={mode === 'unlimited' ? 'cta' : 'ghost'}
          size="sm"
          onClick={() => setMode('unlimited')}
        >
          Unlimited
        </SkewButton>
        <SkewButton
          variant={mode === 'coaches_daily' ? 'gold' : 'ghost'}
          size="sm"
          onClick={() => setMode('coaches_daily')}
        >
          Coaches
        </SkewButton>
        <SkewButton
          variant={mode === 'teams_daily' ? 'gold' : 'ghost'}
          size="sm"
          onClick={() => setMode('teams_daily')}
        >
          Teams
        </SkewButton>
      </div>

      {/* Ad slot above the fold */}
      <AdBanner dataAdSlot="home-top" className="mb-6" />

      {/* Stats bar */}
      <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
        <SkewBadge color="gold">
          {modeLabel} Mode
        </SkewBadge>
        {user ? (
          <>
            <SkewBadge color="green">Streak: {profile?.streak ?? 0}</SkewBadge>
          </>
        ) : (
          <>
            <SkewBadge color="amber">Streak: {guestStats?.streak ?? 0}</SkewBadge>
            <SkewBadge color="gray">Played: {guestStats?.gamesPlayed ?? 0}</SkewBadge>
          </>
        )}
      </div>

      {/* Render selected game */}
      {mode === 'daily' && <PlayerGame mode="daily" />}
      {mode === 'unlimited' && <PlayerGame mode="unlimited" />}
      {mode === 'coaches_daily' && <CoachGame />}
      {mode === 'teams_daily' && <TeamGame />}
    </div>
  );
}
