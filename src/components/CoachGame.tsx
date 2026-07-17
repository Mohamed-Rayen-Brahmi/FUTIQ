import { useState, useMemo, useEffect, useRef } from 'react';
import { useCoachGame } from '../hooks/useCoachGame';
import { CoachCard } from './CoachCard';
import { CoachGrid } from './CoachGrid';
import { CoachSearch } from './CoachSearch';
import { SkewButton, Panel, Spinner, EmptyState } from './ui';
import { Link } from 'react-router-dom';
import { AdBanner } from './AdBanner';
import { useAuth } from '../auth/AuthContext';
import { GameOverModal } from './GameOverModal';

export function CoachGame() {
  const game = useCoachGame();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const prevStatusRef = useRef(game.status);

  useEffect(() => {
    if (prevStatusRef.current === 'playing' && game.status !== 'playing') {
      setShowModal(true);
    }
    prevStatusRef.current = game.status;
  }, [game.status]);

  useEffect(() => {
    if (game.status === 'playing') {
      setShowModal(false);
    }
  }, [game.status]);

  const guessedNames = useMemo(
    () => new Set(game.guesses.map(g => g.coach.name.toLowerCase())),
    [game.guesses],
  );

  return (
    <>
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

      {game.loading && (
        <div className="flex flex-col items-center py-20">
          <Spinner className="text-4xl text-gold" />
          <p className="font-label text-sm uppercase tracking-wide text-slate-500 mt-4">Loading coach...</p>
        </div>
      )}

      {game.error && !game.loading && (
        <EmptyState message="Failed to load game" sub={game.error} />
      )}

      {!game.loading && !game.error && (
        <>
          <div className="flex flex-col-reverse lg:grid lg:grid-cols-[1fr_340px] gap-6 items-start">
            <div className="w-full">
              {game.status === 'playing' && (
                <div className="mb-4">
                  <CoachSearch
                    onGuess={game.makeGuess}
                    disabled={game.status !== 'playing'}
                    guessedNames={guessedNames}
                  />
                </div>
              )}

              <CoachGrid guesses={game.guesses} maxGuesses={game.maxGuesses} />

              <AdBanner dataAdSlot="home-bottom" />

              {game.status !== 'playing' && (
                <div className="mt-6 text-center animate-fade-in">
                  <p className="font-display text-4xl text-gold mb-2">
                    {game.status === 'won' ? 'Correct!' : 'Game Over'}
                  </p>
                  <p className="font-body text-slate-400 mb-4">
                    The answer was <span className="text-slate-200 font-semibold">{game.mysteryCoach.name}</span>
                  </p>
                </div>
              )}

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

            <div className="w-full lg:w-auto lg:sticky lg:top-6 mb-2 lg:mb-0">
              <CoachCard
                coach={game.mysteryCoach}
                status={game.status}
                unlockedStats={game.unlockedStats}
              />
            </div>
          </div>
        </>
      )}

      {game.mysteryCoach && game.status !== 'playing' && !showModal && (
        <div className="fixed bottom-6 right-6 z-40 animate-fade-in">
          <SkewButton variant="gold" onClick={() => setShowModal(true)}>
            View Results
          </SkewButton>
        </div>
      )}

      {showModal && game.mysteryCoach && game.status !== 'playing' && (
        <GameOverModal
          answerName={game.mysteryCoach.name}
          guessesCount={game.guesses.length}
          maxGuesses={game.maxGuesses}
          status={game.status}
          mode="coaches_daily"
          onClose={() => setShowModal(false)}
        >
          <CoachCard
            coach={game.mysteryCoach}
            status={game.status}
            unlockedStats={game.unlockedStats}
          />
        </GameOverModal>
      )}
    </>
  );
}
