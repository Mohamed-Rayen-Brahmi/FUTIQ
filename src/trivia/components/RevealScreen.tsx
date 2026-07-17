import type { TriviaOption, RoundScoreDelta, TriviaParticipant, TriviaVote } from '../types';
import { ChevronRight, Star, Trophy, Zap } from 'lucide-react';

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

interface RevealScreenProps {
  questionText: string;
  roundNumber: number;
  totalRounds: number;
  options: TriviaOption[];
  votes: TriviaVote[];
  scoreDeltas: RoundScoreDelta[];
  participants: TriviaParticipant[];
  mySessionId: string;
  isHost: boolean;
  isLastRound: boolean;
  onNext: () => void;
}

export function RevealScreen({
  questionText,
  roundNumber,
  options,
  votes,
  scoreDeltas,
  participants,
  mySessionId,
  isHost,
  isLastRound,
  onNext,
}: RevealScreenProps) {
  const myDelta    = scoreDeltas.find(d => d.session_id === mySessionId);
  const myVoteId   = votes.find(v => v.voter_session_id === mySessionId)?.option_id;

  return (
    <div className="flex flex-col items-center gap-6 py-6 animate-fade-in max-w-2xl mx-auto px-4">
      {/* Header */}
      <div className="skew-parallelogram bg-gold/20 border border-gold/40 px-5 py-1">
        <span className="skew-inner font-label text-sm font-semibold uppercase tracking-widest text-gold">
          Round {roundNumber} — Reveal
        </span>
      </div>

      {/* Question recap */}
      <p className="font-body text-sm text-slate-400 text-center">{questionText}</p>

      {/* My score delta */}
      {myDelta && (
        <div
          className={`
            w-full p-4 rounded-lg text-center border-2 animate-fade-in
            ${myDelta.delta > 0
              ? 'bg-match-green/10 border-match-green/40'
              : 'bg-ink-panel border-ink-border'}
          `}
        >
          <p className="font-display text-5xl text-match-green leading-none">
            {myDelta.delta > 0 ? `+${myDelta.delta}` : '0'}
          </p>
          <p className="font-label text-xs text-slate-400 uppercase tracking-wide mt-1">
            points this round
          </p>
          <div className="flex items-center justify-center gap-4 mt-2">
            {myDelta.reason.guessed_correctly && (
              <span className="flex items-center gap-1 font-body text-xs text-match-green">
                <Star size={12} /> Correct guess (+2)
              </span>
            )}
            {myDelta.reason.guessed_truth_early && (
              <span className="flex items-center gap-1 font-body text-xs text-match-green">
                <Star size={12} /> Truth guessed early (+2)
              </span>
            )}
            {myDelta.reason.fooled_count > 0 && (
              <span className="flex items-center gap-1 font-body text-xs text-gold">
                <Zap size={12} /> Fooled {myDelta.reason.fooled_count} player{myDelta.reason.fooled_count !== 1 ? 's' : ''} (+{myDelta.reason.fooled_count})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Options with attribution */}
      <div className="w-full flex flex-col gap-2">
        {options.map((opt, i) => {
          const votersForThis = votes.filter(v => v.option_id === opt.id);
          const iMyVote = myVoteId === opt.id || (myVoteId === 'TRUTH_GUESSED' && opt.is_real);
          const isSystem = (!opt.submitted_by || opt.submitted_by.length === 0) && !opt.is_real;

          return (
            <div
              key={opt.id}
              className={`
                flex items-start gap-3 p-3 rounded-lg border transition-all duration-300
                ${opt.is_real
                  ? 'bg-match-green/15 border-match-green/60'
                  : iMyVote
                    ? 'bg-cta/10 border-cta/40'
                    : 'bg-ink-panel border-ink-border'}
              `}
              style={opt.is_real ? { boxShadow: '0 0 15px rgba(46,204,113,0.15)' } : undefined}
            >
              {/* Label */}
              <span
                className={`
                  skew-parallelogram flex-shrink-0 w-8 h-8 flex items-center justify-center
                  font-display text-lg font-bold
                  ${opt.is_real
                    ? 'bg-match-green text-ink-base'
                    : 'bg-ink-border/60 text-slate-500'}
                `}
              >
                <span className="skew-inner">{OPTION_LABELS[i]}</span>
              </span>

              <div className="flex-1 min-w-0">
                {/* Answer text */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-body text-base ${opt.is_real ? 'text-match-green font-semibold' : 'text-slate-300'}`}>
                    {opt.text}
                  </span>
                  {opt.is_real && (
                    <span className="font-label text-xs uppercase tracking-wide bg-match-green/20 text-match-green px-2 py-0.5 rounded">
                      ✓ Correct
                    </span>
                  )}
                  {iMyVote && (
                    <span className="font-label text-xs uppercase tracking-wide bg-cta/20 text-cta px-2 py-0.5 rounded">
                      Your vote
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {opt.is_real ? (
                    <span className="font-label text-xs text-match-green/70">Real answer</span>
                  ) : opt.submitted_by && opt.submitted_by.length > 0 ? (
                    <span className="font-label text-xs text-slate-500">
                      Submitted by <span className="text-gold">{opt.submitted_by.join(', ')}</span>
                    </span>
                  ) : isSystem ? (
                    <span className="font-label text-xs text-slate-600">System decoy</span>
                  ) : null}

                  {/* Who voted for this */}
                  {votersForThis.length > 0 && (
                    <span className="font-label text-xs text-slate-600">
                      · voted by{' '}
                      {votersForThis.map(v => {
                        const p = participants.find(p => p.session_id === v.voter_session_id);
                        return p?.display_name ?? 'Someone';
                      }).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Round score summary */}
      {scoreDeltas.length > 0 && (
        <div className="w-full panel-surface p-4">
          <p className="font-label text-xs uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
            <Trophy size={12} /> Points this round
          </p>
          <div className="flex flex-col gap-2">
            {[...scoreDeltas].sort((a, b) => b.delta - a.delta).map(d => (
              <div key={d.session_id} className="flex items-center justify-between">
                <span className={`font-body text-sm ${d.session_id === mySessionId ? 'text-gold' : 'text-slate-300'}`}>
                  {d.display_name}
                  {d.session_id === mySessionId && ' (you)'}
                </span>
                <span className={`font-display text-lg ${d.delta > 0 ? 'text-match-green' : 'text-slate-600'}`}>
                  {d.delta > 0 ? `+${d.delta}` : '0'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Host next-round button */}
      {isHost && (
        <button
          onClick={onNext}
          className="skew-parallelogram bg-gold text-ink-base font-label font-semibold uppercase tracking-wide px-8 py-3 hover:bg-gold-light transition-colors duration-200"
        >
          <span className="skew-inner flex items-center gap-2">
            {isLastRound ? (
              <><Trophy size={16} /> Final Results</>
            ) : (
              <>Next Round <ChevronRight size={16} /></>
            )}
          </span>
        </button>
      )}

      {!isHost && (
        <p className="font-body text-sm text-slate-500 text-center animate-fade-in">
          Waiting for host to start the next round…
        </p>
      )}
    </div>
  );
}
