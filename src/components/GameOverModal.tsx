import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { X, Facebook, Instagram, Check, Download, Clipboard } from 'lucide-react';
import type { GameMode, GameStatus } from '../types/database';
import { SkewButton } from './ui';
import { shareResult, type SharePlatform, type ShareOutcome } from '../lib/shareImage';

interface GameOverModalProps {
  answerName: string;
  guessesCount: number;
  maxGuesses: number | null;
  status: GameStatus;
  mode: GameMode;
  onClose: () => void;
  onPlayAgain?: () => void;
  children: React.ReactNode; // The card to render (PlayerCard, CoachCard, etc)
  sharePayload?: any; // Only supported for Players currently
}

const OUTCOME_LABEL: Record<ShareOutcome, string> = {
  shared: 'Shared',
  copied: 'Image copied — paste it in your post',
  downloaded: 'Image saved — attach it manually',
  error: 'Could not share',
};

const OUTCOME_ICON: Record<ShareOutcome, typeof Check> = {
  shared: Check,
  copied: Clipboard,
  downloaded: Download,
  error: X,
};

const PRE_SHARE_NOTE: Record<SharePlatform, string> = {
  x: 'Opens X with your result text pre-filled. The image copies to your clipboard — click into the post box and press Ctrl+V (Cmd+V on Mac) to add it.',
  facebook: "Facebook's share window can't accept pre-filled text or images from other sites, so it opens blank. The image copies to your clipboard — paste it with Ctrl+V (Cmd+V), then add your own caption.",
  instagram: 'On a phone, Instagram appears in your share menu with the image already attached. On desktop, the image downloads — open Instagram and upload it there.',
};

export function GameOverModal({
  answerName,
  guessesCount,
  maxGuesses,
  status,
  mode,
  onClose,
  onPlayAgain,
  children,
  sharePayload,
}: GameOverModalProps) {
  const [pending, setPending] = useState<SharePlatform | null>(null);
  const [lastOutcome, setLastOutcome] = useState<{ platform: SharePlatform; outcome: ShareOutcome } | null>(null);
  const [confirming, setConfirming] = useState<SharePlatform | null>(null);
  const won = status === 'won';

  const runShare = async (platform: SharePlatform) => {
    if (!sharePayload) return;
    setConfirming(null);
    setPending(platform);
    setLastOutcome(null);
    try {
      const outcome = await shareResult(platform, sharePayload);
      setLastOutcome({ platform, outcome });
    } catch {
      setLastOutcome({ platform, outcome: 'error' });
    } finally {
      setPending(null);
    }
  };

  const handleShare = (platform: SharePlatform) => {
    setLastOutcome(null);
    setConfirming(platform);
  };

  useEffect(() => {
    if (won) {
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#22c55e', '#facc15', '#ffffff']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#22c55e', '#facc15', '#ffffff']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [won]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${won ? 'animate-[pulse_1s_ease-in-out]' : 'animate-fade-in'}`}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm panel-surface p-6 flex flex-col items-center gap-4 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Confetti handled via canvas-confetti in useEffect */}

        <p className={`font-display text-3xl text-center ${won ? 'text-match-green animate-pulse' : 'text-gold'}`}>
          {won ? 'Correct!' : 'Game Over'}
        </p>
        <p className="font-body text-sm text-slate-400 text-center -mt-2">
          The answer was <span className="text-slate-200 font-semibold">{answerName}</span>
          {maxGuesses !== null ? ` — ${guessesCount}/${maxGuesses} guesses` : ` — ${guessesCount} guesses`}
        </p>

        {children}

        {sharePayload && (
          <div className="w-full">
            <p className="font-label text-xs uppercase tracking-wider text-slate-500 text-center mb-2">
              Share Result
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => handleShare('x')}
                disabled={pending !== null || confirming !== null}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-ink-deep border border-ink-border text-slate-200 hover:border-gold hover:text-gold transition-colors disabled:opacity-50"
                aria-label="Share to X"
              >
                <X size={20} />
              </button>
              <button
                onClick={() => handleShare('facebook')}
                disabled={pending !== null || confirming !== null}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-ink-deep border border-ink-border text-slate-200 hover:border-gold hover:text-gold transition-colors disabled:opacity-50"
                aria-label="Share to Facebook"
              >
                <Facebook size={20} />
              </button>
              <button
                onClick={() => handleShare('instagram')}
                disabled={pending !== null || confirming !== null}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-ink-deep border border-ink-border text-slate-200 hover:border-gold hover:text-gold transition-colors disabled:opacity-50"
                aria-label="Share to Instagram"
              >
                <Instagram size={20} />
              </button>
            </div>

            {confirming && (
              <div className="mt-3 p-3 rounded-md bg-ink-deep border border-ink-border">
                <p className="font-body text-xs text-slate-300 leading-relaxed">
                  {PRE_SHARE_NOTE[confirming]}
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setConfirming(null)}
                    className="flex-1 font-label text-xs uppercase tracking-wide py-2 rounded text-slate-400 border border-ink-border hover:text-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => runShare(confirming)}
                    className="flex-1 font-label text-xs uppercase tracking-wide py-2 rounded bg-gold text-ink-deep hover:brightness-110 transition-all"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {(pending || lastOutcome) && (
              <div className="mt-3 flex items-start justify-center gap-1.5">
                <p className="font-body text-xs text-slate-300 text-center flex items-center gap-1.5">
                  {pending && 'Preparing image...'}
                  {!pending && lastOutcome && (
                    <>
                      {(() => {
                        const Icon = OUTCOME_ICON[lastOutcome.outcome];
                        return <Icon size={13} />;
                      })()}
                      {OUTCOME_LABEL[lastOutcome.outcome]}
                    </>
                  )}
                </p>
                {!pending && lastOutcome && (
                  <button
                    onClick={() => setLastOutcome(null)}
                    className="text-slate-600 hover:text-slate-400 transition-colors"
                    aria-label="Dismiss"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )}
            
            <p className="font-body text-[11px] text-slate-600 text-center mt-4">
              The shared image shows your guess photo blurred — the answer stays hidden.
            </p>
          </div>
        )}

        {mode !== 'daily' && mode !== 'coaches_daily' && mode !== 'teams_daily' && onPlayAgain && (
          <SkewButton variant="gold" onClick={onPlayAgain} className="w-full">
            Play Again
          </SkewButton>
        )}
      </div>
    </div>
  );
}
