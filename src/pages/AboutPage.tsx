import { Panel } from '../components/ui';

export function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-display text-4xl text-gold mb-6">About FutIQ</h1>

      <Panel className="p-6 mb-4">
        <h2 className="font-display text-2xl text-slate-200 mb-3">How to Play</h2>
        <p className="font-body text-slate-400 mb-4">
          FutIQ is a guessing game where you identify a mystery footballer, coach, or team through 
          color-coded attribute feedback. You have 8 guesses per round.
        </p>
        <p className="font-body text-slate-400 mb-3">
          Each guess reveals how close your guess's attributes are to the mystery answer:
        </p>
        <ul className="font-body text-slate-400 list-disc list-inside space-y-1 mb-3">
          <li><span className="text-match-green">Green</span> — exact match</li>
          <li><span className="text-match-amber">Amber</span> — close (same continent, same league, same position group, or within 2 for age/shirt number)</li>
          <li><span className="text-slate-500">Gray</span> — no match</li>
        </ul>
        <p className="font-body text-slate-400 mb-3">
          Arrows on numeric stats (like Age and Shirt Number) tell you whether the true answer is higher or lower.
        </p>
        <p className="font-body text-slate-400">
          Every time a column goes green, that stat permanently unlocks on the card. The card's photo
          progressively blurs less with each guess, fully revealing on win or loss.
        </p>
      </Panel>

      <Panel className="p-6 mb-4">
        <h2 className="font-display text-2xl text-slate-200 mb-3">Game Modes</h2>
        <p className="font-body text-slate-400 mb-2">
          <span className="text-gold font-semibold">Daily:</span> The classic mode. Everyone gets the same mystery player each day. 8 guesses.
        </p>
        <p className="font-body text-slate-400 mb-2">
          <span className="text-cta font-semibold">Unlimited:</span> Random players with no guess cap — keep guessing
          until you get it. Great for practice!
        </p>
        <p className="font-body text-slate-400 mb-2">
          <span className="text-match-green font-semibold">Coaches:</span> Guess the mystery manager based on their nationality, club, league, and age.
        </p>
        <p className="font-body text-slate-400 mb-2">
          <span className="text-match-amber font-semibold">Teams:</span> Guess the mystery football club based on their league, stadium capacity, attack, midfield, and defense ratings.
        </p>
        <p className="font-body text-slate-400">
          <span className="text-blue-400 font-semibold">Trivia:</span> Test your football knowledge in real-time multiplayer trivia rooms!
        </p>
      </Panel>

      <Panel className="p-6">
        <h2 className="font-display text-2xl text-slate-200 mb-3">Data & Assets</h2>
        <p className="font-body text-slate-400">
          Player, coach, and team stats are based on the EA Sports FC 24 database. 
          Photos and logos are sourced externally. FutIQ is an unofficial, fan-made game and is not affiliated with or endorsed by EA Sports or any football club.
        </p>
      </Panel>
    </div>
  );
}
