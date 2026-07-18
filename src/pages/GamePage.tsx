import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GameMode } from '../types/database';
import { useAuth } from '../auth/AuthContext';
import { loadGuestState } from '../lib/guest';
import { SkewButton, SkewBadge } from '../components/ui';
import { AdBanner } from '../components/AdBanner';
import { PlayerGame } from '../components/PlayerGame';
import { CoachGame } from '../components/CoachGame';
import { TeamGame } from '../components/TeamGame';
import { CountdownTimer } from '../components/ui/CountdownTimer';
import { Users, ArrowRight } from 'lucide-react';

export function GamePage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<GameMode>('daily');
  const { user, profile } = useAuth();

  const guestStats = user ? null : loadGuestState();

  const modeLabel = 
    mode === 'daily' ? 'Daily' : 
    mode === 'unlimited' ? 'Unlimited' : 
    mode === 'coaches_daily' ? 'Coaches' : 
    'Teams';

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* SEO hidden h1 */}
      <h1 className="sr-only">Golazio - The Ultimate Football Dle & Trivia Game</h1>
      
      {/* Mode toggle */}
      <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
        <SkewButton
          variant={mode === 'daily' ? 'gold' : 'ghost'}
          size="sm"
          onClick={() => setMode('daily')}
        >
          Daily
        </SkewButton>
        <SkewButton
          variant={mode === 'unlimited' ? 'cta' : 'ghost'}
          size="sm"
          onClick={() => setMode('unlimited')}
        >
          Unlimited
        </SkewButton>
        <SkewButton
          variant={mode === 'coaches_daily' ? 'gold' : 'ghost'}
          size="sm"
          onClick={() => setMode('coaches_daily')}
        >
          Coaches
        </SkewButton>
        <SkewButton
          variant={mode === 'teams_daily' ? 'gold' : 'ghost'}
          size="sm"
          onClick={() => setMode('teams_daily')}
        >
          Teams
        </SkewButton>
      </div>

      {/* Ad slot above the fold */}
      <AdBanner dataAdSlot="home-top" className="mb-6" />

      {/* Stats bar */}
      <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
        <SkewBadge color="gold">
          {modeLabel} Mode
        </SkewBadge>
        {mode.includes('daily') && (
          <SkewBadge color="ink">
            Next in <CountdownTimer />
          </SkewBadge>
        )}
        {user ? (
          <>
            <SkewBadge color="green">Streak: {profile?.streak ?? 0}</SkewBadge>
          </>
        ) : (
          <>
            <SkewBadge color="amber">Streak: {guestStats?.streak ?? 0}</SkewBadge>
            <SkewBadge color="gray">Played: {guestStats?.gamesPlayed ?? 0}</SkewBadge>
          </>
        )}
      </div>

      {/* Render selected game */}
      <div className="mb-6 bg-gradient-to-r from-[#121a22] to-[#131c24] border border-[#ff5b3d]/30 rounded-lg p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in cursor-pointer hover:border-[#ff5b3d]/60 transition-colors group" onClick={() => navigate('/trivia')}>
        <div>
          <h2 className="font-display text-xl sm:text-2xl text-slate-100 flex items-center gap-2 mb-1">
            <Users size={24} className="text-[#ff5b3d]" />
            Play With Friends!
          </h2>
          <p className="font-body text-sm text-slate-400">
            Try the new Multiplayer Bluff Mode. Fool your friends to earn points!
          </p>
        </div>
        <button className="shrink-0 skew-parallelogram bg-cta text-white font-label font-bold uppercase tracking-wide px-6 py-2.5 transition-colors duration-200 group-hover:bg-cta-light">
          <span className="skew-inner flex items-center gap-1.5">
            Join Party <ArrowRight size={16} />
          </span>
        </button>
      </div>

      {mode === 'daily' && <PlayerGame mode="daily" />}
      {mode === 'unlimited' && <PlayerGame mode="unlimited" />}
      {mode === 'coaches_daily' && <CoachGame />}
      {mode === 'teams_daily' && <TeamGame />}

      {/* SEO Rich "How to Play" Section */}
      <div className="mt-12 mb-8 bg-ink-panel border border-ink-border p-6 rounded-lg">
        <h2 className="font-display text-2xl text-slate-100 mb-4">
          How to Play the Daily Football Dle
        </h2>
        <div className="space-y-4 font-body text-sm text-slate-300 leading-relaxed">
          <p>
            Welcome to <strong className="text-cta">Golazio</strong>, the internet's premier <strong>football dle</strong> puzzle. Every day, a new mystery footballer is selected. Your goal is to guess the footballer in as few attempts as possible.
          </p>
          <p>
            With each guess, our daily guessing game provides vital clues:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-slate-400">
            <li><strong className="text-match-green">Green tiles</strong> mean your guess matches the mystery player exactly (e.g., correct league, nationality, or position).</li>
            <li><strong className="text-match-yellow">Yellow tiles</strong> indicate a close match (e.g., same continent but different country, or you are within 2 years of the correct age).</li>
            <li><strong className="text-slate-500">Gray tiles</strong> mean there is no match.</li>
          </ul>
          <p>
            Whether you want to challenge yourself with the daily soccer grid, test your knowledge in the unlimited mode, or invite your friends to play our new multiplayer football trivia party, Golazio is the ultimate daily football quiz. Start guessing today and build your win streak!
          </p>
        </div>
      </div>
    </div>
  );
}
