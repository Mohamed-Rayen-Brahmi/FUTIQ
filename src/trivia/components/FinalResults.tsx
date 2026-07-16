import type { TriviaParticipant } from '../types';
import { Crown, RotateCcw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FinalResultsProps {
  participants: TriviaParticipant[];
  mySessionId: string;
  roomCode: string;
}

export function FinalResults({ participants, mySessionId, roomCode }: FinalResultsProps) {
  const sorted = [...participants].sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  const isWinner = winner?.session_id === mySessionId;

  const MEDAL_COLORS = [
    'from-gold/30 to-gold/5 border-gold/50',
    'from-slate-400/20 to-slate-400/5 border-slate-400/40',
    'from-match-amber/20 to-match-amber/5 border-match-amber/40',
  ];
  const TEXT_COLORS = ['text-gold', 'text-slate-400', 'text-match-amber'];
  const SIZES = ['text-7xl', 'text-5xl', 'text-4xl'];

  return (
    <div className="flex flex-col items-center gap-8 py-8 max-w-lg mx-auto px-4 animate-fade-in">
      {/* Winner announcement */}
      <div className="text-center">
        <p className="font-label text-sm uppercase tracking-widest text-slate-500 mb-2">
          Game Over — Room {roomCode}
        </p>
        <div className="flex items-center justify-center gap-2 mb-1">
          <Crown size={28} className="text-gold" />
          <h1 className="font-display text-5xl text-gold text-glow-gold">
            {isWinner ? 'You win!' : `${winner?.display_name} wins!`}
          </h1>
          <Crown size={28} className="text-gold" />
        </div>
        <p className="font-body text-slate-400 text-sm">
          {isWinner
            ? "You fooled them all. Well played."
            : `${winner?.score} points — unmatched!`}
        </p>
      </div>

      {/* Top 3 podium */}
      <div className="w-full flex flex-col gap-3">
        {sorted.slice(0, Math.min(sorted.length, 8)).map((p, rank) => {
          const isMe = p.session_id === mySessionId;
          const colorClass = MEDAL_COLORS[rank] ?? 'from-ink-panel/50 to-transparent border-ink-border';
          const textColor  = TEXT_COLORS[rank]  ?? 'text-slate-400';
          const sizeClass  = SIZES[rank]         ?? 'text-3xl';

          return (
            <div
              key={p.session_id}
              className={`
                flex items-center gap-4 p-4 rounded-xl border bg-gradient-to-r
                ${colorClass}
                ${isMe ? 'ring-2 ring-gold/30' : ''}
              `}
              style={rank === 0 ? { boxShadow: '0 0 30px rgba(216,180,88,0.15)' } : undefined}
            >
              {/* Rank number */}
              <span className={`font-display leading-none flex-shrink-0 ${sizeClass} ${textColor}`}>
                {rank + 1}
              </span>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className={`font-display text-2xl truncate ${isMe ? 'text-gold' : 'text-slate-200'}`}>
                  {p.display_name}
                  {isMe && <span className="font-body text-sm text-slate-500 ml-2">(you)</span>}
                </p>
                {p.is_host && (
                  <p className="font-label text-xs text-slate-600 uppercase tracking-wide">Host</p>
                )}
              </div>

              {/* Score */}
              <span className={`font-display text-3xl flex-shrink-0 ${textColor}`}>
                {p.score}
              </span>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap justify-center">
        <Link to="/trivia">
          <button className="skew-parallelogram bg-transparent border border-ink-border text-slate-300 hover:border-gold hover:text-gold font-label font-semibold uppercase tracking-wide px-6 py-2.5 transition-colors duration-200">
            <span className="skew-inner flex items-center gap-2">
              <Home size={15} /> Back to Trivia
            </span>
          </button>
        </Link>
        <Link to="/">
          <button className="skew-parallelogram bg-gold text-ink-base font-label font-semibold uppercase tracking-wide px-6 py-2.5 hover:bg-gold-light transition-colors duration-200">
            <span className="skew-inner flex items-center gap-2">
              <RotateCcw size={15} /> Play Golazio
            </span>
          </button>
        </Link>
      </div>
    </div>
  );
}
