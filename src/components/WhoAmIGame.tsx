import { useState, useMemo, useEffect, useRef } from 'react';
import { useWhoAmIGame } from '../hooks/useWhoAmIGame';
import { PlayerSearch } from './PlayerSearch';
import { SkewButton, Panel, Spinner, EmptyState } from './ui';
import { Link } from 'react-router-dom';
import { AdBanner } from './AdBanner';
import { useAuth } from '../auth/AuthContext';
import { GameOverModal } from './GameOverModal';
import { Check, X, HelpCircle } from 'lucide-react';

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
  const blurAmount = game.status !== 'playing' ? 0 : Math.max(0, (8 - game.guesses.length) * 2.5);

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
          
          {/* Mystery Player Header */}
          <div className="flex flex-col items-center justify-center mb-8 relative">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gold opacity-30 rounded-full blur-xl group-hover:opacity-50 transition-opacity duration-500"></div>
              <div 
                className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-gold overflow-hidden bg-ink-panel relative z-10 shadow-2xl flex items-center justify-center"
              >
                {game.answerPlayer?.image_url ? (
                  <img 
                    src={game.answerPlayer.image_url} 
                    alt="Mystery" 
                    className="w-full h-full object-cover transition-all duration-1000"
                    style={{ filter: `blur(${blurAmount}px) grayscale(${game.status === 'playing' ? 100 : 0}%)` }}
                  />
                ) : (
                  <HelpCircle className="w-16 h-16 text-slate-700" />
                )}
                
                {game.status === 'playing' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <HelpCircle className="w-16 h-16 text-gold drop-shadow-lg" />
                  </div>
                )}
              </div>
            </div>
            {game.status !== 'playing' && game.answerPlayer && (
              <h2 className="mt-4 font-display text-3xl text-gold animate-fade-in text-glow-gold">
                {game.answerPlayer.name}
              </h2>
            )}
          </div>

          {game.status === 'playing' && (
            <div className="mb-6 relative z-30">
              <PlayerSearch
                onGuess={game.makeGuess}
                disabled={game.status !== 'playing'}
                guessedNames={guessedNames}
                rpcName="search_all_players"
              />
            </div>
          )}

          <div className="space-y-4 perspective-1000 z-20 relative">
            {game.challenge.hints.map((hint, idx) => {
              const isRevealed = idx < hintsVisible;
              return (
                <div key={idx} className="h-24 md:h-20 w-full relative">
                  <div className={`flip-card w-full h-full ${isRevealed ? 'flipped' : ''}`}>
                    <div className="flip-card-inner shadow-lg">
                      {/* FRONT (Unrevealed Hint) */}
                      <div className="flip-card-front bg-ink-panel border border-ink-border/50 rounded-lg flex items-center justify-center">
                        <div className="flex items-center gap-3 opacity-40">
                          <HelpCircle className="w-5 h-5 text-gold" />
                          <span className="font-label uppercase tracking-widest text-sm text-gold">Hint {idx + 1} Locked</span>
                        </div>
                      </div>
                      
                      {/* BACK (Revealed Hint) */}
                      <div className="flip-card-back bg-ink-deep border border-gold/30 rounded-lg flex items-center px-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 bottom-0 w-1 bg-gold shadow-[0_0_10px_rgba(216,180,88,0.8)]"></div>
                        <div className="absolute -right-4 -top-4 opacity-5">
                          <HelpCircle className="w-32 h-32" />
                        </div>
                        <div className="w-full relative z-10">
                          <h3 className="font-label text-gold/70 text-[10px] uppercase tracking-widest mb-1">Hint {idx + 1}</h3>
                          <p className="font-body text-slate-100 text-base md:text-lg leading-tight">{hint}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-10 bg-ink-panel/50 border border-ink-border rounded-xl p-5">
            <h3 className="font-label text-slate-400 text-sm uppercase tracking-wide mb-4 text-center">
              Your Guesses ({game.guesses.length}/{game.maxGuesses})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {game.guesses.map((g, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${g.isCorrect ? 'bg-match-green/10 border-match-green/50 shadow-[0_0_15px_rgba(46,204,113,0.15)]' : 'bg-match-gray/10 border-match-gray/30'}`}>
                  <div className={`p-1.5 rounded-full ${g.isCorrect ? 'bg-match-green/20 text-match-green' : 'bg-match-gray/20 text-slate-400'}`}>
                    {g.isCorrect ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
                  </div>
                  <span className="font-body text-slate-200 truncate">{g.player.name}</span>
                </div>
              ))}
              {Array.from({ length: game.maxGuesses - game.guesses.length }).map((_, i) => (
                <div key={`empty-${i}`} className="p-3 rounded-lg border border-dashed border-ink-border bg-ink-deep/30 flex items-center justify-center opacity-40">
                  <span className="font-label text-xs tracking-widest text-slate-500 uppercase">Empty</span>
                </div>
              ))}
            </div>
          </div>

          <AdBanner dataAdSlot="home-bottom" />

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
              <div className="text-center mt-4 border border-ink-border bg-ink-deep rounded-lg p-6 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 text-gold opacity-5 rotate-12">
                  <HelpCircle className="w-48 h-48" />
                </div>
                <img 
                  src={game.answerPlayer.image_url || '/placeholder.png'} 
                  alt={game.answerPlayer.name} 
                  className="w-32 h-32 object-cover rounded-full mx-auto mb-4 border-4 border-gold shadow-[0_0_20px_rgba(216,180,88,0.3)] relative z-10" 
                />
                <h2 className="font-display text-3xl text-gold relative z-10 text-glow-gold">{game.answerPlayer.name}</h2>
                <p className="text-slate-300 font-label tracking-wide uppercase mt-2 relative z-10">
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
