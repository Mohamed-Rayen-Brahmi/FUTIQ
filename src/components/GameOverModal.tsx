import { useState } from 'react';
import { X, Facebook, Instagram, Check, Download, Clipboard } from 'lucide-react';
import type { Player, GuessRow, GameMode, GameStatus } from '../types/database';
import { PlayerCard } from './PlayerCard';
import { SkewButton } from './ui';
import { shareResult, type SharePlatform, type ShareOutcome } from '../lib/shareImage';

interface GameOverModalProps {
  player: Player;
  guesses: GuessRow[];
  maxGuesses: number | null;
  status: GameStatus;
  mode: GameMode;
  unlockedStats: Set<string>;
  onClose: () => void;
  onPlayAgain?: () => void;
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

// Set expectations *before* the platform opens and the person's focus jumps
// away — none of these platforms let an outside site auto-attach an image
// (that's a deliberate cross-site security restriction, not something any
// amount of code here can work around), so the best honest UX is telling
// people exactly what manual step is coming next.
const PRE_SHARE_NOTE: Record<SharePlatform, string> = {
  x: 'Opens X with your result text pre-filled. The image copies to your clipboard — click into the post box and press Ctrl+V (Cmd+V on Mac) to add it.',
  facebook: "Facebook's share window can't accept pre-filled text or images from other sites, so it opens blank. The image copies to your clipboard — paste it with Ctrl+V (Cmd+V), then add your own caption.",
  instagram: 'On a phone, Instagram appears in your share menu with the image already attached. On desktop, the image downloads — open Instagram and upload it there.',
};

export function GameOverModal({
  player,
  guesses,
  maxGuesses,
  status,
  mode,
  unlockedStats,
  onClose,
  onPlayAgain,
}: GameOverModalProps) {
  const [pending, setPending] = useState<SharePlatform | null>(null);
  const [lastOutcome, setLastOutcome] = useState<{ platform: SharePlatform; outcome: ShareOutcome } | null>(null);
  const [confirming, setConfirming] = useState<SharePlatform | null>(null);
  const won = status === 'won';

  const runShare = async (platform: SharePlatform) => {
    setConfirming(null);
    setPending(platform);
    setLastOutcome(null);
    try {
      const outcome = await shareResult(platform, { mode, guesses, maxGuesses, won, player });
      setLastOutcome({ platform, outcome });
    } catch {
      setLastOutcome({ platform, outcome: 'error' });
    } finally {
      setPending(null);
      // Outcome stays visible until the person shares again or closes the
      // modal — no auto-dismiss, since "paste it manually" is an instruction
      // they need time to act on, not a transient status update.
    }
  };

  const handleShare = (platform: SharePlatform) => {
    setLastOutcome(null);
    setConfirming(platform);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm panel-surface p-6 flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <p className="font-display text-3xl text-gold text-center">
          {won ? 'Correct!' : 'Game Over'}
        </p>
        <p className="font-body text-sm text-slate-400 text-center -mt-2">
          The answer was <span className="text-slate-200 font-semibold">{player.name}</span>
          {maxGuesses !== null ? ` — ${guesses.length}/${maxGuesses} guesses` : ` — ${guesses.length} guesses`}
        </p>

        <PlayerCard
          player={player}
          status={status}
          unlockedStats={unlockedStats}
        />

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
        </div>

        {mode !== 'daily' && onPlayAgain && (
          <SkewButton variant="gold" onClick={onPlayAgain} className="w-full">
            Play Again
          </SkewButton>
        )}

        <p className="font-body text-[11px] text-slate-600 text-center">
          The shared image shows your guess photo blurred — the answer stays hidden.
        </p>
      </div>
    </div>
  );
}
