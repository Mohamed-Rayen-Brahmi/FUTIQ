import { useState, useEffect } from 'react';
import type { GameMode } from '../types/database';
import { LeagueSelector, SupportedLeague } from './LeagueSelector';
import { PlayerGame } from './PlayerGame';

interface PlayerModeFlowProps {
  mode: 'daily' | 'unlimited';
}

export function PlayerModeFlow({ mode }: PlayerModeFlowProps) {
  const [selectedLeague, setSelectedLeague] = useState<SupportedLeague | null>(null);

  // Reset selected league if mode changes (e.g. from daily to unlimited)
  useEffect(() => {
    setSelectedLeague(null);
  }, [mode]);

  if (!selectedLeague) {
    return (
      <LeagueSelector 
        modeLabel={mode === 'daily' ? 'Daily' : 'Unlimited'} 
        onSelectLeague={setSelectedLeague} 
        onBack={() => {}} // Could be handled differently, but since it's just toggles on the page, maybe omit back or just do nothing
      />
    );
  }

  return <PlayerGame mode={mode} league={selectedLeague} onBack={() => setSelectedLeague(null)} />;
}
