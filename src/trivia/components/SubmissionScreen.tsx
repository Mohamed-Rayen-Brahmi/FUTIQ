import { useState, useRef, useEffect } from 'react';
import { CountdownRing, usePhaseCountdown } from './CountdownRing';
import { Send, Clock } from 'lucide-react';

interface SubmissionScreenProps {
  questionText: string;
  roundNumber: number;
  totalRounds: number;
  phaseEndsAt: string | null;
  totalSeconds: number;
  hasSubmitted: boolean;
  onSubmit: (answer: string) => void;
  onTruthGuessEarly?: () => void;
  realAnswer?: string;
  truthGuessedLocal?: boolean;
  participantCount: number;
  submittedCount: number;
}

export function SubmissionScreen({
  questionText,
  roundNumber,
  totalRounds,
  phaseEndsAt,
  totalSeconds,
  hasSubmitted,
  onSubmit,
  onTruthGuessEarly,
  realAnswer,
  truthGuessedLocal,
  participantCount,
  submittedCount,
}: SubmissionScreenProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const remaining = usePhaseCountdown(phaseEndsAt);

  useEffect(() => {
    if (!hasSubmitted) inputRef.current?.focus();
  }, [hasSubmitted]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    
    if (realAnswer && trimmed.toLowerCase() === realAnswer.toLowerCase()) {
      if (onTruthGuessEarly) onTruthGuessEarly();
      setValue('');
      return;
    }
    
    onSubmit(trimmed);
  }

  const isUrgent = remaining <= 10;

  return (
    <div className="flex flex-col items-center gap-8 py-6 animate-fade-in max-w-2xl mx-auto px-4">
      {/* Round header */}
      <div className="flex items-center justify-between w-full">
        <div className="skew-parallelogram bg-gold/20 border border-gold/40 px-4 py-1">
          <span className="skew-inner font-label text-sm font-semibold uppercase tracking-widest text-gold">
            Round {roundNumber} of {totalRounds}
          </span>
        </div>
        <CountdownRing
          totalSeconds={totalSeconds}
          remainingSeconds={remaining}
          size={64}
          urgentThreshold={10}
        />
      </div>

      {/* Question panel */}
      <div
        className="w-full panel-surface p-6 text-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #121a22 0%, #1a2530 50%, #121a22 100%)',
          border: '1px solid #d8b45840',
          boxShadow: '0 0 40px rgba(216,180,88,0.08)',
        }}
      >
        {/* Decorative skewed background accent */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(120deg, transparent 30%, rgba(216,180,88,0.04) 50%, transparent 70%)',
          }}
        />
        <p className="font-label text-xs uppercase tracking-widest text-slate-500 mb-3">
          ⚽ Question
        </p>
        <h2 className="font-display text-3xl sm:text-4xl text-slate-100 leading-snug relative z-10">
          {questionText}
        </h2>
      </div>

      {/* Submission area */}
      {!hasSubmitted ? (
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          {truthGuessedLocal && (
            <div className="bg-match-green/20 border border-match-green/50 text-match-green px-4 py-3 rounded-lg text-sm text-center mb-2 animate-bounce">
              <span className="font-bold">You found the truth! (+2 pts)</span><br />
              Now enter a convincing lie to trick others.
            </div>
          )}
          <p className="font-body text-sm text-slate-400 text-center">
            {truthGuessedLocal ? 'Write your fake answer below:' : 'Write a convincing fake answer — try to fool everyone!'}
          </p>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="Your answer…"
              maxLength={80}
              disabled={isUrgent && remaining <= 0}
              className={`
                w-full bg-ink-panel border-2 rounded-lg px-4 py-3 pr-16
                font-body text-lg text-slate-100 placeholder-slate-600
                outline-none transition-all duration-200
                ${isUrgent
                  ? 'border-cta focus:border-cta'
                  : 'border-ink-border focus:border-gold'}
              `}
            />
            <button
              type="submit"
              disabled={!value.trim()}
              className={`
                absolute right-2 top-1/2 -translate-y-1/2
                w-10 h-10 rounded-lg flex items-center justify-center
                transition-all duration-200
                ${value.trim()
                  ? 'bg-gold text-ink-base hover:bg-gold-light'
                  : 'bg-ink-border/50 text-slate-600 cursor-not-allowed'}
              `}
            >
              <Send size={18} />
            </button>
          </div>
          <p className="font-label text-xs text-center text-slate-600 uppercase tracking-wide">
            Press Enter or tap the arrow to lock in your answer
          </p>
        </form>
      ) : (
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-match-green/20 border-2 border-match-green flex items-center justify-center">
            <span className="text-2xl">✓</span>
          </div>
          <p className="font-display text-2xl text-match-green">Answer locked in!</p>
          <p className="font-body text-sm text-slate-400">
            Waiting for others…
          </p>
        </div>
      )}

      {/* Submission progress */}
      <div className="w-full flex items-center gap-3">
        <Clock size={14} className="text-slate-600 flex-shrink-0" />
        <div className="flex-1 h-1.5 bg-ink-border rounded-full overflow-hidden">
          <div
            className="h-full bg-gold/60 rounded-full transition-all duration-500"
            style={{ width: `${(submittedCount / participantCount) * 100}%` }}
          />
        </div>
        <span className="font-label text-xs text-slate-500 uppercase tracking-wide flex-shrink-0">
          {submittedCount}/{participantCount} submitted
        </span>
      </div>
    </div>
  );
}
