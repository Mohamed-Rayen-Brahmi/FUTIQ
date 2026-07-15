import type { Coach } from '../types/database';

interface CoachCardProps {
  coach: Coach;
  status: 'playing' | 'won' | 'lost';
  unlockedStats: Set<string>;
}

export function CoachCard({ coach, status, unlockedStats }: CoachCardProps) {
  const gameOver = status !== 'playing';
  const showName = gameOver;
  const isRevealed = (stat: string) => gameOver || unlockedStats.has(stat);

  return (
    <div className="w-full max-w-[340px] mx-auto bg-ink-panel border border-ink-border rounded-xl overflow-hidden shadow-xl aspect-[3/4] flex flex-col items-center justify-center relative p-6 text-center">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-ink-deep/50 pointer-events-none" />
      
      {showName ? (
        <div className="z-10 animate-fade-in">
          {coach.image_url ? (
            <img src={coach.image_url} alt={coach.name} className="w-32 h-32 rounded-full object-cover border-4 border-gold mx-auto mb-4" />
          ) : (
            <div className="w-32 h-32 rounded-full border-4 border-gold mx-auto mb-4 bg-ink-deep flex items-center justify-center text-4xl">👨‍💼</div>
          )}
          <h2 className="font-display text-2xl text-gold mb-1">{coach.name}</h2>
          <p className="font-label text-sm text-slate-300">{coach.club}</p>
        </div>
      ) : (
        <div className="z-10 flex flex-col items-center">
          {coach.image_url ? (
            <div className="w-32 h-32 rounded-full border-4 border-ink-border mx-auto mb-4 overflow-hidden relative bg-ink-deep">
              <img 
                src={coach.image_url} 
                alt="Mystery Coach" 
                className="w-full h-full object-cover absolute inset-0"
                style={{ filter: 'blur(10px)', transform: 'scale(1.1)' }} 
              />
            </div>
          ) : (
            <div className="w-32 h-32 rounded-full border-4 border-ink-border mx-auto mb-4 bg-ink-deep flex items-center justify-center text-4xl text-slate-600">?</div>
          )}
          <h2 className="font-display text-2xl text-slate-500 mb-1">???</h2>
        </div>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4 w-full z-10 text-left">
        <div>
          <p className="font-label text-[10px] uppercase text-slate-500">Nation</p>
          <p className="font-body text-slate-200">{isRevealed('nationality') ? coach.nationality : '???'}</p>
        </div>
        <div>
          <p className="font-label text-[10px] uppercase text-slate-500">League</p>
          <p className="font-body text-slate-200">{isRevealed('league') ? coach.league : '???'}</p>
        </div>
        <div>
          <p className="font-label text-[10px] uppercase text-slate-500">Age</p>
          <p className="font-body text-slate-200">{isRevealed('age') ? coach.age : '???'}</p>
        </div>
        <div>
          <p className="font-label text-[10px] uppercase text-slate-500">Club</p>
          <p className="font-body text-slate-200">{isRevealed('club') ? coach.club : '???'}</p>
        </div>
      </div>
    </div>
  );
}
