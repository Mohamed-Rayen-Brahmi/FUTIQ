import { useRef, useState, useCallback } from 'react';
import type { Team } from '../types/database';
import { CARD_TIERS } from '../types/database';

interface TeamCardProps {
  team: Team;
  status: 'playing' | 'won' | 'lost';
  unlockedStats: Set<string>;
}

const CLIP_PATH = 'polygon(8% 0%, 100% 0%, 100% 88%, 85% 100%, 0% 100%, 0% 8%)';

export function TeamCard({ team, status, unlockedStats }: TeamCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [hovering, setHovering] = useState(false);
  const [foilActive, setFoilActive] = useState(false);

  const tierConfig = CARD_TIERS['gold'];

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ rx: -y * 12, ry: x * 12 });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setHovering(true);
    setFoilActive(true);
    setTimeout(() => setFoilActive(false), 800);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHovering(false);
    setTilt({ rx: 0, ry: 0 });
  }, []);

  const gameOver = status !== 'playing';
  const showName = gameOver;
  const isRevealed = (stat: string) => gameOver || unlockedStats.has(stat);

  return (
    <div className="perspective-1000 w-full max-w-[340px] mx-auto">
      <div
        ref={cardRef}
        className="relative gpu-accelerated transition-transform duration-300 ease-out preserve-3d"
        style={{
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          clipPath: CLIP_PATH,
          aspectRatio: '3 / 4',
          background: tierConfig.gradient,
          boxShadow: hovering
            ? `0 20px 60px ${tierConfig.glow}, inset 0 0 0 2px ${tierConfig.border}, inset 0 0 20px rgba(255,255,255,0.05)`
            : `0 10px 30px ${tierConfig.glow}, inset 0 0 0 2px ${tierConfig.border}, inset 0 0 20px rgba(255,255,255,0.03)`,
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {foilActive && (
          <div className="absolute inset-0 pointer-events-none z-30" style={{ clipPath: CLIP_PATH, overflow: 'hidden' }}>
            <div className="absolute inset-0 animate-foil-sweep" style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.25) 50%, transparent 60%)' }} />
          </div>
        )}

        <div className="absolute inset-0 z-0 bg-ink-deep flex items-center justify-center" style={{ clipPath: CLIP_PATH, overflow: 'hidden' }}>
           <span className={`text-9xl transition-all duration-500 ${!showName ? 'opacity-20 blur-sm' : 'opacity-100'}`}>🏟️</span>
           <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,14,20,0.95) 0%, rgba(10,14,20,0.4) 50%, transparent 100%)' }} />
        </div>

        <div className="absolute top-0 left-0 z-20 p-5 pl-6 flex flex-col items-start gap-2" style={{ width: '45%' }}>
          <div className="font-display text-5xl leading-none text-white text-glow-gold">
            {isRevealed('overall') ? team.overall : '??'}
          </div>
          <div className="font-display text-xl leading-none text-gold mt-1">
            {isRevealed('league') ? (team.league?.slice(0,3) || '???') : '???'}
          </div>
          
          <div className="flex flex-col gap-1.5 mt-2">
            <div className="w-10 h-7 rounded-sm overflow-hidden border border-ink-border bg-ink-deep flex items-center justify-center">
              {isRevealed('country') ? (
                <span className="font-label text-xs text-slate-300">{team.country?.slice(0, 3).toUpperCase() || '???'}</span>
              ) : (
                <span className="font-label text-xs text-slate-600">???</span>
              )}
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-5 pt-12">
          {showName ? (
            <>
              <div className="font-display text-3xl leading-none uppercase text-center text-white mb-2" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                {team.name}
              </div>
              <div className="font-label text-[10px] uppercase text-center text-gold">{team.stadium || 'Unknown Stadium'}</div>
            </>
          ) : (
            <div className="font-display text-3xl leading-none text-center text-slate-600">???</div>
          )}
        </div>
      </div>
    </div>
  );
}
