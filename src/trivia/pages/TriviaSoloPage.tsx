import { useTriviaSolo } from '../hooks/useTriviaSolo';
import { FinalResults } from '../components/FinalResults';
import { Spinner } from '../../components/ui';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import type { TriviaParticipant } from '../types';
import { AdBanner } from '../../components/AdBanner';

// Fake solo participant for FinalResults reuse
function makeSoloParticipant(score: number, sessionId: string): TriviaParticipant {
  return {
    id: sessionId,
    room_id: '',
    session_id: sessionId,
    display_name: 'You',
    score,
    is_host: true,
    joined_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
  };
}

export function TriviaSoloPage() {
  const {
    status,
    score,
    currentIndex,
    totalQuestions,
    currentQuestion,
    selectedOptionId,
    selectOption,
    nextQuestion,
  } = useTriviaSolo();

  const SOLO_SESSION = 'solo';

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center py-20 gap-4 animate-fade-in">
        <Spinner className="text-4xl text-gold" />
        <p className="font-label text-sm uppercase tracking-wide text-slate-500">
          Loading questions…
        </p>
      </div>
    );
  }

  if (status === 'finished') {
    return (
      <div className="max-w-lg mx-auto py-8">
        <FinalResults
          participants={[makeSoloParticipant(score, SOLO_SESSION)]}
          mySessionId={SOLO_SESSION}
          roomCode="SOLO"
        />
        <div className="mt-4 text-center">
          <p className="font-body text-slate-400 mb-4">
            You scored <span className="text-gold font-semibold">{score}</span> out of {totalQuestions}
          </p>
          <Link to="/trivia/solo">
            <button
              onClick={() => window.location.reload()}
              className="skew-parallelogram bg-gold text-ink-base font-label font-semibold uppercase tracking-wide px-6 py-2.5 hover:bg-gold-light transition-colors duration-200"
            >
              <span className="skew-inner">Play Again</span>
            </button>
          </Link>
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <Link to="/trivia" className="flex items-center gap-1.5 text-slate-500 hover:text-gold transition-colors font-label text-sm uppercase tracking-wide">
          <ArrowLeft size={15} /> Back
        </Link>
        <div className="flex items-center gap-3">
          <span className="font-label text-xs uppercase tracking-wide text-slate-500">
            {currentIndex + 1} / {totalQuestions}
          </span>
          <span className="font-display text-2xl text-gold">{score} pts</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-ink-border rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-gold rounded-full transition-all duration-500"
          style={{ width: `${((currentIndex + (status === 'revealed' ? 1 : 0)) / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Question panel */}
      <div
        className="panel-surface p-6 text-center mb-6"
        style={{
          background: 'linear-gradient(135deg, #121a22 0%, #1a2530 50%, #121a22 100%)',
          border: '1px solid #d8b45840',
        }}
      >
        <p className="font-label text-xs uppercase tracking-widest text-slate-500 mb-3">⚽ Question</p>
        <h2 className="font-display text-3xl sm:text-4xl text-slate-100 leading-snug">
          {currentQuestion.text}
        </h2>
      </div>

      {/* Options — reuse VotingScreen layout but without countdown */}
      {status === 'question' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {currentQuestion.options.map((opt, i) => {
            const LABELS = ['A','B','C','D','E','F','G','H'];
            return (
              <button
                key={opt.id}
                id={`solo-opt-${opt.id}`}
                onClick={() => selectOption(opt.id)}
                className="group flex items-center gap-3 p-4 rounded-lg border-2 border-ink-border bg-ink-panel hover:border-gold/60 hover:bg-ink-deep text-left transition-all duration-200 cursor-pointer"
              >
                <span className="skew-parallelogram flex-shrink-0 w-9 h-9 flex items-center justify-center bg-ink-border/60 text-slate-400 font-display text-lg font-bold transition-colors duration-200 group-hover:bg-gold/20 group-hover:text-gold">
                  <span className="skew-inner">{LABELS[i]}</span>
                </span>
                <span className="font-body text-base text-slate-300 leading-snug">{opt.text}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Revealed state */}
      {status === 'revealed' && (
        <div className="flex flex-col gap-4 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentQuestion.options.map((opt, i) => {
              const LABELS = ['A','B','C','D','E','F','G','H'];
              const isSelected = opt.id === selectedOptionId;
              const isReal     = opt.is_real;
              const wrongPick  = isSelected && !isReal;

              return (
                <div
                  key={opt.id}
                  className={`
                    flex items-center gap-3 p-4 rounded-lg border-2 transition-all duration-300
                    ${isReal
                      ? 'bg-match-green/15 border-match-green/60'
                      : wrongPick
                        ? 'bg-cta/10 border-cta/40'
                        : 'bg-ink-panel border-ink-border opacity-60'}
                  `}
                >
                  <span className={`skew-parallelogram flex-shrink-0 w-9 h-9 flex items-center justify-center font-display text-lg font-bold ${isReal ? 'bg-match-green text-ink-base' : 'bg-ink-border/60 text-slate-500'}`}>
                    <span className="skew-inner">{LABELS[i]}</span>
                  </span>
                  <span className={`font-body text-base flex-1 ${isReal ? 'text-match-green font-semibold' : 'text-slate-400'}`}>
                    {opt.text}
                  </span>
                  {isReal && <CheckCircle size={18} className="text-match-green flex-shrink-0" />}
                  {wrongPick && <XCircle size={18} className="text-cta flex-shrink-0" />}
                </div>
              );
            })}
          </div>

          {/* Result message */}
          <div className={`text-center py-3 rounded-lg ${currentQuestion.options.find(o => o.id === selectedOptionId)?.is_real ? 'bg-match-green/10' : 'bg-cta/10'}`}>
            <p className={`font-display text-2xl ${currentQuestion.options.find(o => o.id === selectedOptionId)?.is_real ? 'text-match-green' : 'text-cta'}`}>
              {currentQuestion.options.find(o => o.id === selectedOptionId)?.is_real ? '✓ Correct!' : '✗ Wrong'}
            </p>
            <p className="font-body text-sm text-slate-400 mt-1">
              The answer was <span className="text-slate-200 font-semibold">{currentQuestion.real_answer}</span>
            </p>
          </div>

          <button
            onClick={nextQuestion}
            className="skew-parallelogram bg-gold text-ink-base font-label font-semibold uppercase tracking-wide px-8 py-3 hover:bg-gold-light transition-colors duration-200 self-center"
          >
            <span className="skew-inner">
              {currentIndex + 1 >= totalQuestions ? 'See Results' : 'Next Question'}
            </span>
          </button>
        </div>
      )}

      {/* Ads */}
      <AdBanner dataAdSlot="trivia-solo" className="mt-8" />
    </div>
  );
}
