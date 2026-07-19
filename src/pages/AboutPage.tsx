import { Panel } from '../components/ui';

export function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <div className="text-center mb-10">
        <h1 className="font-display text-5xl text-gold mb-4 text-glow-gold">About Golazio</h1>
        <p className="font-body text-slate-300 text-lg max-w-2xl mx-auto">
          The internet's premier destination for football trivia, daily puzzles, and the ultimate test of your soccer knowledge.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Panel className="p-8">
          <h2 className="font-display text-3xl text-slate-100 mb-4 border-b border-ink-border pb-2">Our Mission</h2>
          <p className="font-body text-slate-400 mb-4 leading-relaxed">
            At Golazio, our mission is to unite football fans from every corner of the globe through the universal language of trivia and statistical deduction. We believe that true fans do not just watch the game—they analyze it, obsess over it, and memorize the minute details that make the beautiful game so special. 
          </p>
          <p className="font-body text-slate-400 leading-relaxed">
            By transforming standard sports statistics into an engaging, daily puzzle format, we aim to challenge your memory and expand your knowledge of the world's greatest leagues, players, and managers. Whether you support a massive club in the Premier League, La Liga, Serie A, or a local underdog, Golazio is built to celebrate the diversity of world football.
          </p>
        </Panel>

        <Panel className="p-8">
          <h2 className="font-display text-3xl text-slate-100 mb-4 border-b border-ink-border pb-2">How to Play</h2>
          <p className="font-body text-slate-400 mb-4">
            Golazio is fundamentally a guessing game where you must identify a mystery footballer, coach, or team through color-coded attribute feedback. You are granted exactly 8 guesses per round.
          </p>
          <p className="font-body text-slate-400 mb-3">
            Each guess reveals how close your guess's attributes are to the mystery answer:
          </p>
          <ul className="font-body text-slate-300 list-disc list-inside space-y-2 mb-4 bg-ink-deep p-4 rounded-lg border border-ink-border">
            <li><span className="text-match-green font-bold">Green</span> — Exact match. You guessed the attribute perfectly.</li>
            <li><span className="text-match-amber font-bold">Amber</span> — Close match. For geographical data, this means the same continent. For numerical data (like age), this means you are within a margin of 2.</li>
            <li><span className="text-slate-500 font-bold">Gray</span> — No match. Use this to eliminate variables.</li>
          </ul>
          <p className="font-body text-slate-400">
            Arrows on numeric stats (like Age and Shirt Number) tell you whether the true answer is higher or lower. Use these clues strategically to secure victory!
          </p>
        </Panel>
      </div>

      <Panel className="p-8">
        <h2 className="font-display text-3xl text-slate-100 mb-4 border-b border-ink-border pb-2">Explore Our Game Modes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          <div className="bg-ink-deep p-5 rounded-lg border border-ink-border">
            <h3 className="text-gold font-display text-xl mb-2">Daily Player</h3>
            <p className="font-body text-sm text-slate-400">The classic puzzle. Everyone globally gets the exact same mystery player each day. Solve it in as few guesses as possible to maximize your daily score and climb the leaderboards.</p>
          </div>
          <div className="bg-ink-deep p-5 rounded-lg border border-ink-border">
            <h3 className="text-cta font-display text-xl mb-2">Unlimited</h3>
            <p className="font-body text-sm text-slate-400">Randomly generated players from our massive database. You still have 8 guesses per game, but there is no limit to how many games you can play. Excellent for sharpening your skills.</p>
          </div>
          <div className="bg-ink-deep p-5 rounded-lg border border-ink-border">
            <h3 className="text-match-green font-display text-xl mb-2">Coaches</h3>
            <p className="font-body text-sm text-slate-400">Think you know the tacticians? Guess the mystery manager based on their nationality, club, league, and age. The perfect mode for the true football obsessives.</p>
          </div>
          <div className="bg-ink-deep p-5 rounded-lg border border-ink-border">
            <h3 className="text-match-amber font-display text-xl mb-2">Teams</h3>
            <p className="font-body text-sm text-slate-400">Guess the mystery football club based on their league, stadium capacity, attack ratings, midfield structure, and defense solidity.</p>
          </div>
          <div className="bg-ink-deep p-5 rounded-lg border border-ink-border">
            <h3 className="text-[#a855f7] font-display text-xl mb-2">Who Am I?</h3>
            <p className="font-body text-sm text-slate-400">A heavily blurred image and 8 progressive text hints. With every wrong guess, the image unblurs slightly and a new, easier hint is revealed. Can you guess the player from just a silhouette?</p>
          </div>
          <div className="bg-ink-deep p-5 rounded-lg border border-ink-border">
            <h3 className="text-blue-400 font-display text-xl mb-2">Multiplayer Trivia</h3>
            <p className="font-body text-sm text-slate-400">Create private rooms, invite your friends, and engage in real-time, fast-paced trivia battles. Bluff your opponents and answer questions quickly to earn maximum points!</p>
          </div>
        </div>
      </Panel>

      <Panel className="p-8">
        <h2 className="font-display text-3xl text-slate-100 mb-4 border-b border-ink-border pb-2">Community & Fair Play</h2>
        <p className="font-body text-slate-400 leading-relaxed mb-4">
          The integrity of the Golazio leaderboards relies on fair play. While we encourage discussing daily puzzles with your friends, we ask that you do not spoil the daily answers on social media without using spoiler warnings. Let everyone experience the thrill of the deduction process!
        </p>
        <p className="font-body text-slate-400 leading-relaxed">
          If you encounter any bugs, have suggestions for new game modes, or want to report inaccurate database statistics, please visit our Contact page. We are continuously updating our database to reflect real-world transfers, managerial changes, and player retirements.
        </p>
      </Panel>

      <Panel className="p-8 mb-8">
        <h2 className="font-display text-3xl text-slate-100 mb-4 border-b border-ink-border pb-2">Data Integrity & Legal</h2>
        <p className="font-body text-slate-400 leading-relaxed">
          The comprehensive player, coach, and team statistics utilized in Golazio are heavily inspired by real-world football data and the EA Sports FC 24 database metrics. All player headshots, club logos, and national flags are sourced from publicly available external APIs. 
        </p>
        <p className="font-body text-slate-400 leading-relaxed mt-4">
          <strong>Disclaimer:</strong> Golazio is an unofficial, completely fan-made educational game. It is not affiliated with, endorsed by, or sponsored by EA Sports, FIFA, UEFA, or any individual football club or league. All trademarks and intellectual properties remain the sole property of their respective owners.
        </p>
      </Panel>
    </div>
  );
}
