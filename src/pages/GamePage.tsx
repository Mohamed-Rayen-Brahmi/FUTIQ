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
import { WhoAmIGame } from '../components/WhoAmIGame';
import { CountdownTimer } from '../components/ui/CountdownTimer';
import { Users, ArrowRight } from 'lucide-react';
import { PlayerModeFlow } from '../components/PlayerModeFlow';

export function GamePage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<GameMode>('daily');
  const { user, profile } = useAuth();

  const guestStats = user ? null : loadGuestState();

  const modeLabel = 
    mode === 'daily' ? 'Daily' : 
    mode === 'unlimited' ? 'Unlimited' : 
    mode === 'coaches_daily' ? 'Coaches' : 
    mode === 'teams_daily' ? 'Teams' : 
    'Who Am I';

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
        <SkewButton
          variant={mode === 'who_am_i_daily' ? 'gold' : 'ghost'}
          size="sm"
          onClick={() => setMode('who_am_i_daily')}
        >
          Who Am I
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

      {mode === 'coaches_daily' && <CoachGame />}
      {mode === 'teams_daily' && <TeamGame />}
      {mode === 'who_am_i_daily' && <WhoAmIGame />}
      
      {/* League Selection for Player Modes */}
      {(mode === 'daily' || mode === 'unlimited') && (
        <PlayerModeFlow mode={mode} />
      )}

      {/* SEO Rich "Ultimate Guide" Section for Google AdSense & SEO */}
      <div className="mt-12 mb-8 bg-ink-panel border border-ink-border p-6 md:p-10 rounded-lg">
        <h2 className="font-display text-2xl md:text-3xl text-slate-100 mb-6 border-b border-ink-border pb-4">
          The Ultimate Guide to Daily Football Dle & Soccer Trivia
        </h2>
        
        <div className="space-y-6 font-body text-sm md:text-base text-slate-300 leading-relaxed">
          <section>
            <h3 className="font-display text-xl text-gold mb-2">Welcome to Golazio</h3>
            <p>
              Welcome to <strong className="text-cta">Golazio</strong>, the internet's premier destination for the daily <strong>football dle</strong> puzzle and global soccer trivia. If you are a massive fan of the beautiful game, you have found the ultimate hub to test your knowledge. Every single day, our system selects a new mystery footballer from the top leagues across the world. Your ultimate goal is to guess the identity of the mystery footballer in as few attempts as possible. Drawing inspiration from the popular wordle format, Golazio transforms the traditional text puzzle into a deep, engaging, statistical challenge for football fanatics everywhere.
            </p>
          </section>

          <section>
            <h3 className="font-display text-xl text-gold mb-2">How to Play the Daily Football Puzzle</h3>
            <p>
              Playing the daily puzzle is simple to learn but difficult to master. You begin by typing the name of any active (or sometimes retired) professional soccer player into the search bar. With each guess you submit, our sophisticated feedback system provides you with vital, color-coded clues to help you narrow down the mystery player:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-3 text-slate-400">
              <li><strong className="text-match-green">Green Tiles (Exact Match):</strong> A green tile indicates that your guessed player perfectly matches the mystery player in that specific category. For example, if you see a green tile under "League", it means the mystery player plays in the exact same league as the player you guessed.</li>
              <li><strong className="text-match-yellow">Yellow Tiles (Close Match):</strong> A yellow tile indicates you are very close. If the "Nation" tile is yellow, it means the mystery player is from the same continent, but a different country. For the "Age" or "Shirt Number" categories, a yellow tile means your guess is within exactly 2 units (years or numbers) of the correct answer.</li>
              <li><strong className="text-slate-500">Gray Tiles (No Match):</strong> A gray tile means there is absolutely no overlap between your guess and the mystery player for that specific attribute. Use this to quickly eliminate leagues, nations, or positions!</li>
            </ul>
          </section>

          <section>
            <h3 className="font-display text-xl text-gold mb-2">Explore Multiple Game Modes</h3>
            <p>
              We know that one puzzle a day just isn't enough for true football tacticians. That is why Golazio offers a rich variety of game modes to keep you entertained for hours:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-3 text-slate-400">
              <li><strong>Daily Mode:</strong> The classic experience. One player, one puzzle, updated at midnight every day. Compete on the global leaderboards.</li>
              <li><strong>Unlimited Mode:</strong> Missed a day or just want to keep playing? The unlimited mode generates random mystery players endlessly so you can practice your deductive skills.</li>
              <li><strong>Coaches & Teams Mode:</strong> Think you know the masterminds behind the tactics? Try guessing the daily Coach, or identify the daily club in our Teams mode!</li>
              <li><strong>Who Am I Mode:</strong> A completely different style of trivia. You are presented with a heavily blurred avatar of a famous player and a series of text hints. With every wrong guess, the blur is reduced and a new hint is revealed. Can you guess who it is before the final hint?</li>
              <li><strong>Multiplayer Party Mode:</strong> Invite your friends into a private lobby for a real-time trivia battle. Bluff your friends, answer questions rapidly, and prove who really knows the most about world football.</li>
            </ul>
          </section>

          <section>
            <h3 className="font-display text-xl text-gold mb-2">Build Your Streak and Climb the Ranks</h3>
            <p>
              By creating a free account on Golazio, you unlock the ability to track your win streaks, view your historical statistics, and most importantly, climb the Global Rankings. Every time you successfully complete a daily puzzle—whether it's the player, the coach, the team, or the Who Am I challenge—you earn points based on how quickly you solved it. The fewer guesses you take, the more points you earn. These points aggregate into your all-time score, cementing your legacy on the global leaderboard.
            </p>
            <p className="mt-4">
              So, what are you waiting for? Dive into the ultimate daily soccer grid, challenge your friends to our multiplayer football trivia party, and prove that you are the greatest football mind on the internet. Start guessing today, build your win streak, and become a Golazio legend!
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
