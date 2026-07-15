import { useState, useMemo, useEffect, useRef } from 'react';
import { useGame } from '../hooks/useGame';
import { PlayerCard } from '../components/PlayerCard';
import { GameGrid } from '../components/GameGrid';
import { PlayerSearch } from '../components/PlayerSearch';
import { GameOverModal } from '../components/GameOverModal';
import { SkewButton, SkewBadge, Panel, Spinner, EmptyState } from '../components/ui';
import type { GameMode } from '../types/database';
import { loadGuestState } from '../lib/guest';
import { useAuth } from '../auth/AuthContext';
import { Link } from 'react-router-dom';

export function GamePage() {
  const [mode, setMode] = useState<GameMode>('daily');
  const game = useGame(mode);
  const { user, profile } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const prevStatusRef = useRef(game.status);

  // Auto-open the result modal exactly when a round finishes (the
  // playing -> won/lost transition), not when a previously-finished round is
  // simply restored from storage on page load — the person already saw it.
  useEffect(() => {
    if (prevStatusRef.current === 'playing' && game.status !== 'playing') {
      setShowModal(true);
    }
    prevStatusRef.current = game.status;
  }, [game.status]);

  // Reset modal visibility when a new round starts (mode switch or Play Again).
  useEffect(() => {
    setShowModal(false);
  }, [mode, game.mysteryPlayer?.id]);

  const guessedNames = useMemo(
    () => new Set(game.guesses.map(g => g.player.name.toLowerCase())),
    [game.guesses],
  );

  const guestStats = user ? null : loadGuestState();

  const modeLabel = mode === 'daily' ? 'Daily' : mode === 'training' ? 'Training' : 'Unlimited';
  const guessesLabel = game.maxGuesses === null
    ? `Guesses: ${game.guesses.length}`
    : `Guesses: ${game.guesses.length}/${game.maxGuesses}`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Mode toggle */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <SkewButton
          variant={mode === 'daily' ? 'gold' : 'ghost'}
          size="sm"
          onClick={() => setMode('daily')}
        >
          Daily
        </SkewButton>
        <SkewButton
          variant={mode === 'training' ? 'cta' : 'ghost'}
          size="sm"
          onClick={() => setMode('training')}
        >
          Training
        </SkewButton>
        <SkewButton
          variant={mode === 'unlimited' ? 'cta' : 'ghost'}
          size="sm"
          onClick={() => setMode('unlimited')}
        >
          Unlimited
        </SkewButton>
      </div>

      {/* Ad slot above the fold */}
      <div className="h-[90px] bg-ink-deep/30 border border-ink-border/40 rounded-lg flex items-center justify-center mb-6">
        <span className="font-label text-xs uppercase tracking-widest text-slate-700">Ad Slot</span>
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
        <SkewBadge color="gold">
          {modeLabel} Mode
        </SkewBadge>
        {user ? (
          <>
            <SkewBadge color="green">Streak: {profile?.streak ?? 0}</SkewBadge>
            <SkewBadge color="amber">{guessesLabel}</SkewBadge>
          </>
        ) : (
          <>
            <SkewBadge color="amber">Streak: {guestStats?.streak ?? 0}</SkewBadge>
            <SkewBadge color="gray">Played: {guestStats?.gamesPlayed ?? 0}</SkewBadge>
          </>
        )}
      </div>

      {/* Guest banner */}
      {game.showBanner && !user && (
        <div className="mb-6 animate-fade-in">
          <Panel className="flex items-center justify-between px-4 py-3 gap-4">
            <p className="font-body text-sm text-slate-300">
              Create an account to save your streak and stats.
            </p>
            <Link to="/register">
              <SkewButton variant="cta" size="sm">Sign Up</SkewButton>
            </Link>
          </Panel>
        </div>
      )}

      {/* Loading state */}
      {game.loading && (
        <div className="flex flex-col items-center py-20">
          <Spinner className="text-4xl text-gold" />
          <p className="font-label text-sm uppercase tracking-wide text-slate-500 mt-4">Loading player...</p>
        </div>
      )}

      {/* Error state */}
      {game.error && !game.loading && (
        <EmptyState
          message="Failed to load game"
          sub={game.error}
        />
      )}

      {/* Game content */}
      {!game.loading && !game.error && game.mysteryPlayer && (
        <>
          <div className="flex flex-col-reverse lg:grid lg:grid-cols-[1fr_340px] gap-6 items-start">
            {/* Grid + search */}
            <div className="w-full">
              {/* Search */}
              {game.status === 'playing' && (
                <div className="mb-4">
                  <PlayerSearch
                    onGuess={game.makeGuess}
                    disabled={game.status !== 'playing'}
                    guessedNames={guessedNames}
                  />
                </div>
              )}

              <GameGrid guesses={game.guesses} maxGuesses={game.maxGuesses} />

              {/* Ad slot below grid */}
              <div className="h-[90px] bg-ink-deep/30 border border-ink-border/40 rounded-lg flex items-center justify-center mt-4 mb-4">
                <span className="font-label text-xs uppercase tracking-widest text-slate-700">Ad Slot</span>
              </div>



              {/* Give up / reveal answer — Unlimited mode only, since it has no guess cap */}
              {mode === 'unlimited' && game.status === 'playing' && game.guesses.length > 0 && (
                <div className="mt-4 text-center">
                  <SkewButton variant="ghost" size="sm" onClick={game.giveUp}>
                    Give Up / Reveal Answer
                  </SkewButton>
                </div>
              )}

              {/* Win/Loss message */}
              {game.status !== 'playing' && (
                <div className="mt-6 text-center animate-fade-in">
                  <p className="font-display text-4xl text-gold mb-2">
                    {game.status === 'won' ? 'Correct!' : 'Game Over'}
                  </p>
                  <p className="font-body text-slate-400 mb-4">
                    The answer was <span className="text-slate-200 font-semibold">{game.mysteryPlayer.name}</span>
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    {!showModal && (
                      <SkewButton variant="ghost" onClick={() => setShowModal(true)}>
                        View Result / Share
                      </SkewButton>
                    )}
                    {mode !== 'daily' && (
                      <SkewButton variant="gold" onClick={game.reset}>
                        Play Again
                      </SkewButton>
                    )}
                  </div>
                </div>
              )}

              {/* Legend */}
              <div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-match-green/30 border border-match-green" />
                  <span className="font-label text-xs uppercase text-slate-500">Exact</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-match-amber/30 border border-match-amber" />
                  <span className="font-label text-xs uppercase text-slate-500">Close</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-match-gray/20 border border-match-gray" />
                  <span className="font-label text-xs uppercase text-slate-500">No Match</span>
                </div>
              </div>
            </div>

            {/* Card */}
            <div className="w-full lg:w-auto lg:sticky lg:top-6 mb-2 lg:mb-0">
              <PlayerCard
                player={game.mysteryPlayer}
                status={game.status}
                unlockedStats={game.unlockedStats}
              />
            </div>
          </div>
        </>
      )}

      {showModal && game.mysteryPlayer && game.status !== 'playing' && (
        <GameOverModal
          player={game.mysteryPlayer}
          guesses={game.guesses}
          maxGuesses={game.maxGuesses}
          status={game.status}
          mode={mode}
          unlockedStats={game.unlockedStats}
          onClose={() => setShowModal(false)}
          onPlayAgain={mode !== 'daily' ? game.reset : undefined}
        />
      )}
    </div>
  );
}
