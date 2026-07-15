import { useRef, useState, useCallback } from 'react';
import type { Player, CardTier } from '../types/database';
import { CARD_TIERS } from '../types/database';
import { PlayerAvatar } from './PlayerAvatar';

interface PlayerCardProps {
  player: Player;
  status: 'playing' | 'won' | 'lost';
  unlockedStats: Set<string>;
  tier?: CardTier;
}

const CLIP_PATH = 'polygon(8% 0%, 100% 0%, 100% 88%, 85% 100%, 0% 100%, 0% 8%)';

export const CARD_CLIP_POLYGON: [number, number][] = [
  [0.08, 0], [1, 0], [1, 0.88], [0.85, 1], [0, 1], [0, 0.08],
];

// Rating derived from a hash of player stats — purely cosmetic
export function computeRating(player: Player): number {
  let h = 0;
  const s = player.name + player.position_code + (player.age || 25);
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return 72 + (Math.abs(h) % 18); // 72-89
}

export function PlayerCard({
  player,
  status,
  unlockedStats,
  tier = 'gold',
}: PlayerCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [hovering, setHovering] = useState(false);
  const [foilActive, setFoilActive] = useState(false);
  const [imgError, setImgError] = useState(false);

  const tierConfig = CARD_TIERS[tier];
  const rating = computeRating(player);

  // The photo stays fully blurred for the entire round — no gradual reveal —
  // and only becomes sharp the instant the round ends (win or loss), same as
  // the rest of the card's stats.
  const BLUR_WHILE_PLAYING = 14;
  const blurAmount = status === 'playing' ? BLUR_WHILE_PLAYING : 0;

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

  const showPhoto = player.image_url && !imgError;
  const gameOver = status !== 'playing';
  const showName = gameOver;
  const showAttribution = player.image_attribution && showPhoto && gameOver;

  // Every stat only shows via its exact-match unlock during play. At game
  // over (win or loss), everything reveals — same "show the answer" behavior
  // the name already had.
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
        {/* Foil shine sweep */}
        {foilActive && (
          <div
            className="absolute inset-0 pointer-events-none z-30"
            style={{ clipPath: CLIP_PATH, overflow: 'hidden' }}
          >
            <div
              className="absolute inset-0 animate-foil-sweep"
              style={{
                background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.25) 50%, transparent 60%)',
              }}
            />
          </div>
        )}

        {/* Photo / Avatar area — right two-thirds */}
        <div className="absolute inset-0 z-0" style={{ clipPath: CLIP_PATH, overflow: 'hidden' }}>
          {showPhoto ? (
            <>
              {/* Blurred placeholder skeleton */}
              {blurAmount > 0 && (
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(135deg, ${player.club_primary_color || '#333'}22, #0a0e14)`,
                  }}
                />
              )}
              <img
                src={player.image_url!}
                alt={player.name}
                loading="lazy"
                onError={() => setImgError(true)}
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  filter: blurAmount > 0 ? `blur(${blurAmount}px)` : 'none',
                  transform: 'scale(1.1)', // prevent blur edges
                  transition: 'filter 0.4s ease-out',
                }}
              />
              {/* Dark gradient overlay for text readability */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to top, rgba(10,14,20,0.9) 0%, rgba(10,14,20,0.3) 40%, transparent 60%)',
                }}
              />
            </>
          ) : (
            // Static placeholder — no per-player variation, so blur/progressive
            // reveal doesn't apply here; it just stays as-is throughout the round.
            <div className="absolute inset-0">
              <PlayerAvatar className="w-full h-full" />
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to top, rgba(10,14,20,0.9) 0%, transparent 50%)',
                }}
              />
            </div>
          )}
        </div>

        {/* Left column — rating, position, icons, mini-stats */}
        <div className="absolute top-0 left-0 z-20 p-5 pl-6 flex flex-col items-start gap-2" style={{ width: '38%' }}>
          <div className="font-display text-5xl leading-none text-white text-glow-gold">
            {rating}
          </div>
          <div className="font-display text-2xl leading-none text-gold -mt-1">
            {isRevealed('position') ? (player.position_code || '??') : '?'}
          </div>

          {/* Nation flag placeholder + club crest */}
          <div className="flex flex-col gap-1.5 mt-1">
            <div className="w-10 h-7 rounded-sm overflow-hidden border border-ink-border bg-ink-deep flex items-center justify-center">
              {isRevealed('nation') ? (
                <span className="font-label text-xs text-slate-300">{player.nation?.slice(0, 3).toUpperCase() || '???'}</span>
              ) : (
                <span className="font-label text-xs text-slate-600">???</span>
              )}
            </div>
            <div
              className="w-10 h-7 rounded-sm border border-ink-border flex items-center justify-center"
              style={{ background: player.club_primary_color || '#333' }}
            >
              <span
                className="font-label text-[10px] font-bold uppercase"
                style={{ color: player.club_secondary_color || '#fff' }}
              >
                {isRevealed('club') ? (player.club?.slice(0, 3) || '???') : '???'}
              </span>
            </div>
          </div>

          {/* Mini-stats near bottom */}
          <div className="mt-auto pt-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span className="font-label text-[10px] uppercase text-slate-400">AGE</span>
              <span className="font-display text-lg leading-none text-slate-100">
                {isRevealed('age') ? (player.age ?? '??') : '?'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-label text-[10px] uppercase text-slate-400">SHIRT</span>
              <span className="font-display text-lg leading-none text-slate-100">
                {isRevealed('shirt') ? (player.shirt_number ?? '??') : '?'}
              </span>
            </div>
          </div>
        </div>

        {/* Player name — lower third with gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-5 pt-12">
          {showName ? (
            <div
              className="font-display text-3xl leading-none uppercase text-center text-white"
              style={{
                textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                background: 'linear-gradient(to bottom, #fff 0%, #ccc 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {player.name}
            </div>
          ) : (
            <div className="font-display text-3xl leading-none text-center text-slate-600">
              ???
            </div>
          )}
        </div>

        {/* Attribution credit */}
        {showAttribution && (
          <div className="absolute bottom-1 right-2 z-20" style={{ clipPath: CLIP_PATH }}>
            <p className="font-body text-[8px] text-slate-500 opacity-50">
              {player.image_attribution}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
