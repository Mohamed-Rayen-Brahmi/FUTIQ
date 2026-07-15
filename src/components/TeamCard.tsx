import type { Team } from '../types/database';

interface TeamCardProps {
  team: Team;
  status: 'playing' | 'won' | 'lost';
  unlockedStats: Set<string>;
}

export function TeamCard({ team, status, unlockedStats }: TeamCardProps) {
  const gameOver = status !== 'playing';
  const showName = gameOver;
  const isRevealed = (stat: string) => gameOver || unlockedStats.has(stat);

  return (
    <div className="w-full max-w-[340px] mx-auto bg-ink-panel border border-ink-border rounded-xl overflow-hidden shadow-xl aspect-[3/4] flex flex-col items-center justify-center relative p-6 text-center">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-ink-deep/50 pointer-events-none" />
      
      {showName ? (
        <div className="z-10 animate-fade-in">
          <div className="w-32 h-32 rounded-full border-4 border-gold mx-auto mb-4 bg-ink-deep flex items-center justify-center text-5xl">🏟️</div>
          <h2 className="font-display text-2xl text-gold mb-1">{team.name}</h2>
          <p className="font-label text-sm text-slate-300">{team.league}</p>
        </div>
      ) : (
        <div className="z-10">
          <div className="w-32 h-32 rounded-full border-4 border-ink-border mx-auto mb-4 bg-ink-deep flex items-center justify-center text-5xl opacity-30 text-slate-600">🏟️</div>
          <h2 className="font-display text-2xl text-slate-500 mb-1">???</h2>
        </div>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4 w-full z-10 text-left">
        <div>
          <p className="font-label text-[10px] uppercase text-slate-500">Country</p>
          <p className="font-body text-slate-200">{isRevealed('country') ? team.country : '???'}</p>
        </div>
        <div>
          <p className="font-label text-[10px] uppercase text-slate-500">OVR</p>
          <p className="font-display text-xl text-slate-200">{isRevealed('overall') ? team.overall : '???'}</p>
        </div>
        <div className="col-span-2">
          <p className="font-label text-[10px] uppercase text-slate-500">Stadium</p>
          <p className="font-body text-slate-200">{isRevealed('stadium') ? team.stadium : '???'}</p>
        </div>
      </div>
    </div>
  );
}
