import { CountdownRing, usePhaseCountdown } from './CountdownRing';
import type { TriviaOption } from '../types';

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

interface VotingScreenProps {
  questionText: string;
  roundNumber: number;
  totalRounds: number;
  options: TriviaOption[];
  phaseEndsAt: string | null;
  selectedOptionId: string | null;
  mySessionId: string;
  onVote: (optionId: string) => void;
  participantCount: number;
  votedCount: number;
}

export function VotingScreen({
  questionText,
  roundNumber,
  totalRounds,
  options,
  phaseEndsAt,
  totalSeconds,
  selectedOptionId,
  mySessionId,
  onVote,
  participantCount,
  votedCount,
}: VotingScreenProps) {
  const remaining = usePhaseCountdown(phaseEndsAt);

  return (
    <div className="flex flex-col items-center gap-6 py-6 animate-fade-in max-w-2xl mx-auto px-4">
      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <div className="skew-parallelogram bg-cta/20 border border-cta/40 px-4 py-1">
          <span className="skew-inner font-label text-sm font-semibold uppercase tracking-widest text-cta">
            Round {roundNumber} of {totalRounds} — Vote!
          </span>
        </div>
        <CountdownRing
          totalSeconds={totalSeconds}
          remainingSeconds={remaining}
          size={64}
          color="#ff5b3d"
          urgentColor="#cc3a20"
          urgentThreshold={10}
        />
      </div>

      {/* Question */}
      <div
        className="w-full panel-surface p-5 text-center"
        style={{
          background: 'linear-gradient(135deg, #121a22 0%, #1e1520 50%, #121a22 100%)',
          border: '1px solid #ff5b3d30',
        }}
      >
        <p className="font-label text-xs uppercase tracking-widest text-slate-500 mb-2">Which is the REAL answer?</p>
        <h2 className="font-display text-2xl sm:text-3xl text-slate-100 leading-snug">
          {questionText}
        </h2>
      </div>

      {selectedOptionId === 'TRUTH_GUESSED' ? (
        <div className="w-full panel-surface p-8 text-center bg-match-green/10 border-match-green/50">
          <p className="font-display text-2xl text-match-green mb-2">You found the truth early!</p>
          <p className="font-body text-slate-400">Waiting for other players to fall for your lie...</p>
        </div>
      ) : (
        <>
          {/* Options grid */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
            {options.map((opt, i) => {
              const selected = selectedOptionId === opt.id;
              const hasVoted = selectedOptionId !== null;
              const isMyOwn = opt.session_ids?.includes(mySessionId);
              
              return (
                <button
                  key={opt.id}
                  id={`option-${opt.id}`}
                  onClick={() => !hasVoted && !isMyOwn && onVote(opt.id)}
                  disabled={hasVoted || isMyOwn}
                  className={`
                    group relative flex items-center gap-3 p-4 rounded-lg
                    border-2 text-left transition-all duration-200
                    ${selected
                      ? 'bg-cta/20 border-cta shadow-lg'
                      : isMyOwn
                        ? 'bg-ink-deep border-ink-border opacity-50 cursor-not-allowed grayscale'
                        : hasVoted
                          ? 'bg-ink-panel border-ink-border opacity-60'
                          : 'bg-ink-panel border-ink-border hover:border-gold/60 hover:bg-ink-deep cursor-pointer'}
                  `}
                  style={selected ? { boxShadow: '0 0 20px rgba(255,91,61,0.25)' } : undefined}
                >
                  {/* Label badge */}
                  <span
                    className={`
                      skew-parallelogram flex-shrink-0 w-9 h-9 flex items-center justify-center
                      font-display text-xl font-bold
                      ${selected ? 'bg-cta text-white' : 'bg-ink-border/60 text-slate-400'}
                      transition-colors duration-200
                    `}
                  >
                    <span className="skew-inner">{OPTION_LABELS[i]}</span>
                  </span>

                  {/* Answer text */}
                  <span
                    className={`
                      font-body text-base leading-snug
                      ${selected ? 'text-white font-semibold' : 'text-slate-300'}
                    `}
                  >
                    {opt.text}
                  </span>

                  {/* Selected indicator */}
                  {selected && (
                    <span className="ml-auto text-cta font-bold text-lg">✓</span>
                  )}
                  {/* Own answer indicator */}
                  {isMyOwn && !selected && (
                    <span className="ml-auto text-slate-500 text-xs uppercase font-label">Your Lie</span>
                  )}
                </button>
              );
            })}
          </div>

          {selectedOptionId && (
            <p className="font-body text-sm text-slate-400 text-center animate-fade-in">
              Vote locked in! Waiting for others…
            </p>
          )}
        </>
      )}

      {/* Vote progress */}
      <div className="w-full flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-ink-border rounded-full overflow-hidden">
          <div
            className="h-full bg-cta/70 rounded-full transition-all duration-500"
            style={{ width: `${(votedCount / participantCount) * 100}%` }}
          />
        </div>
        <span className="font-label text-xs text-slate-500 uppercase tracking-wide flex-shrink-0">
          {votedCount}/{participantCount} voted
        </span>
      </div>

      {selectedOptionId && (
        <p className="font-body text-sm text-slate-400 text-center animate-fade-in">
          Vote locked in! Waiting for others…
        </p>
      )}
    </div>
  );
}
