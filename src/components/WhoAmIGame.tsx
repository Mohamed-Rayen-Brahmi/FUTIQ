import { useState, useMemo, useEffect, useRef } from 'react';
import { useWhoAmIGame } from '../hooks/useWhoAmIGame';
import { PlayerSearch } from './PlayerSearch';
import { SkewButton, Panel, Spinner, EmptyState } from './ui';
import { Link } from 'react-router-dom';
import { AdBanner } from './AdBanner';
import { useAuth } from '../auth/AuthContext';
import { GameOverModal } from './GameOverModal';
import { Check, X } from 'lucide-react';

export function WhoAmIGame() {
  const game = useWhoAmIGame();
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
    () => new Set(game.guesses.map(g => g.player.name.toLowerCase())),
    [game.guesses],
  );

  const hintsVisible = Math.min(8, game.guesses.length + 1);

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
          <p className="font-label text-sm uppercase tracking-wide text-slate-500 mt-4">Loading mystery player...</p>
        </div>
      )}

      {game.error && !game.loading && (
        <EmptyState message="Failed to load game" sub={game.error} />
      )}

      {!game.loading && !game.error && game.challenge && (
        <div className="max-w-3xl mx-auto space-y-6">
          {game.status === 'playing' && (
            <div className="mb-4">
              <PlayerSearch
                onGuess={game.makeGuess}
                disabled={game.status !== 'playing'}
                guessedNames={guessedNames}
                rpcName="search_all_players"
              />
            </div>
          )}

          <div className="space-y-4">
            {game.challenge.hints.slice(0, hintsVisible).map((hint, idx) => (
              <Panel key={idx} className="animate-fade-in p-4 border border-ink-border bg-ink-panel relative overflow-hidden">
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-gold"></div>
                <h3 className="font-label text-gold text-xs uppercase tracking-wide mb-2">Hint {idx + 1}</h3>
                <p className="font-body text-slate-200 text-lg">{hint}</p>
              </Panel>
            ))}
          </div>

          <div className="mt-8">
            <h3 className="font-label text-slate-400 text-sm uppercase tracking-wide mb-3">Your Guesses ({game.guesses.length}/{game.maxGuesses})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {game.guesses.map((g, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${g.isCorrect ? 'bg-match-green/10 border-match-green/30' : 'bg-match-gray/10 border-match-gray/30'}`}>
                  <div className={`p-1 rounded-full ${g.isCorrect ? 'bg-match-green/20 text-match-green' : 'bg-match-gray/20 text-slate-400'}`}>
                    {g.isCorrect ? <Check size={16} /> : <X size={16} />}
                  </div>
                  <span className="font-body text-slate-200">{g.player.name}</span>
                </div>
              ))}
              {Array.from({ length: game.maxGuesses - game.guesses.length }).map((_, i) => (
                <div key={`empty-${i}`} className="p-3 rounded-lg border border-dashed border-ink-border bg-ink-deep/50 flex items-center justify-center opacity-30">
                  <span className="font-body text-slate-500">Guess {game.guesses.length + i + 1}</span>
                </div>
              ))}
            </div>
          </div>

          <AdBanner dataAdSlot="home-bottom" />

          {game.status !== 'playing' && (
            <div className="mt-6 text-center animate-fade-in">
              <p className="font-display text-4xl text-gold mb-2">
                {game.status === 'won' ? 'Correct!' : 'Game Over'}
              </p>
              <p className="font-body text-slate-400 mb-4">
                The answer was <span className="text-slate-200 font-semibold">{game.answerPlayer?.name}</span>
              </p>
            </div>
          )}

          {game.answerPlayer && game.status !== 'playing' && !showModal && (
            <div className="fixed bottom-6 right-6 z-40 animate-fade-in">
              <SkewButton variant="gold" onClick={() => setShowModal(true)}>
                View Results
              </SkewButton>
            </div>
          )}

          {showModal && game.answerPlayer && game.status !== 'playing' && (
            <GameOverModal
              answerName={game.answerPlayer.name}
              guessesCount={game.guesses.length}
              maxGuesses={game.maxGuesses}
              status={game.status}
              mode="who_am_i_daily"
              onClose={() => setShowModal(false)}
            >
              <div className="text-center mt-4 border border-ink-border bg-ink-deep rounded-lg p-6">
                <img 
                  src={game.answerPlayer.image_url || '/placeholder.png'} 
                  alt={game.answerPlayer.name} 
                  className="w-32 h-32 object-cover rounded-full mx-auto mb-4 border-4 border-gold" 
                />
                <h2 className="font-display text-3xl text-gold">{game.answerPlayer.name}</h2>
                <p className="text-slate-400 font-label tracking-wide uppercase mt-2">
                  {game.answerPlayer.club} • {game.answerPlayer.nation}
                </p>
              </div>
            </GameOverModal>
          )}
        </div>
      )}
    </>
  );
}
