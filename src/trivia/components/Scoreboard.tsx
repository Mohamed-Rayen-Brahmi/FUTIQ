import type { TriviaParticipant } from '../types';
import { Trophy, Crown, Medal } from 'lucide-react';

interface ScoreboardProps {
  participants: TriviaParticipant[];
  mySessionId: string;
  roundNumber?: number;
  totalRounds?: number;
  compact?: boolean;
}

const RANK_ICONS = [
  <Crown key="1" size={16} className="text-gold" />,
  <Medal key="2" size={16} className="text-slate-400" />,
  <Trophy key="3" size={16} className="text-match-amber" />,
];

export function Scoreboard({
  participants,
  mySessionId,
  roundNumber,
  totalRounds,
  compact = false,
}: ScoreboardProps) {
  const sorted = [...participants].sort((a, b) => b.score - a.score);
  const maxScore = sorted[0]?.score ?? 1;

  return (
    <div className="panel-surface p-4 w-full">
      {!compact && (
        <div className="flex items-center justify-between mb-4">
          <p className="font-label text-xs uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <Trophy size={12} /> Scoreboard
          </p>
          {roundNumber != null && totalRounds != null && (
            <span className="font-label text-xs text-slate-600 uppercase tracking-wide">
              After round {roundNumber}/{totalRounds}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {sorted.map((p, rank) => {
          const isMe = p.session_id === mySessionId;
          const pct  = maxScore > 0 ? (p.score / maxScore) * 100 : 0;

          return (
            <div
              key={p.session_id}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300
                ${isMe ? 'bg-gold/10 border border-gold/30' : 'bg-ink-deep/40 border border-transparent'}
              `}
            >
              {/* Rank */}
              <span className="w-6 flex-shrink-0 flex items-center justify-center">
                {rank < 3 ? RANK_ICONS[rank] : (
                  <span className="font-label text-xs text-slate-600">{rank + 1}</span>
                )}
              </span>

              {/* Name + bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-body text-sm truncate ${isMe ? 'text-gold font-semibold' : 'text-slate-300'}`}>
                    {p.display_name}{isMe ? ' (you)' : ''}
                    {p.is_host && (
                      <span className="ml-2 font-label text-xs text-slate-600 uppercase">[host]</span>
                    )}
                  </span>
                  <span className={`font-display text-xl leading-none ml-2 flex-shrink-0 ${isMe ? 'text-gold' : 'text-slate-200'}`}>
                    {p.score}
                  </span>
                </div>
                {!compact && (
                  <div className="h-1 bg-ink-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${isMe ? 'bg-gold' : 'bg-slate-600'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
