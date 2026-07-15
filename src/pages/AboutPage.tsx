import { Panel } from '../components/ui';

export function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-display text-4xl text-gold mb-6">About FutIQ</h1>

      <Panel className="p-6 mb-4">
        <h2 className="font-display text-2xl text-slate-200 mb-3">How to Play</h2>
        <p className="font-body text-slate-400 mb-4">
          FutIQ is a Wordle-style guessing game where you identify a mystery footballer through 
          color-coded attribute feedback. You have 8 guesses per round.
        </p>
        <p className="font-body text-slate-400 mb-3">
          Each guess reveals how close your player's attributes are to the mystery player:
        </p>
        <ul className="font-body text-slate-400 list-disc list-inside space-y-1 mb-3">
          <li><span className="text-match-green">Green</span> — exact match</li>
          <li><span className="text-match-amber">Amber</span> — close (same continent, same league, same position group, or within 2 for age/shirt number)</li>
          <li><span className="text-slate-500">Gray</span> — no match</li>
        </ul>
        <p className="font-body text-slate-400 mb-3">
          Arrows on the Age and Shirt Number columns tell you whether the true answer is higher or lower.
        </p>
        <p className="font-body text-slate-400">
          Every time a column goes green, that stat permanently unlocks on the card. The card's photo
          progressively blurs less with each guess, fully revealing on win or loss.
        </p>
      </Panel>

      <Panel className="p-6 mb-4">
        <h2 className="font-display text-2xl text-slate-200 mb-3">Game Modes</h2>
        <p className="font-body text-slate-400 mb-2">
          <span className="text-gold font-semibold">Daily:</span> Everyone gets the same mystery player each day. 8 guesses.
        </p>
        <p className="font-body text-slate-400 mb-2">
          <span className="text-cta font-semibold">Training:</span> Random players for practice — the daily answer is
          excluded so you won't spoil it early. 8 guesses, same as Daily.
        </p>
        <p className="font-body text-slate-400">
          <span className="text-cta font-semibold">Unlimited:</span> Random players with no guess cap — keep guessing
          until you get it, or use "Give Up" to reveal the answer. Counts toward games played, but not toward your streak.
        </p>
      </Panel>

      <Panel className="p-6">
        <h2 className="font-display text-2xl text-slate-200 mb-3">Player Data</h2>
        <p className="font-body text-slate-400">
          Player stats are sourced from TheSportsDB's free API. Photos are auto-populated from
          Wikidata/Wikimedia Commons under Creative Commons or public-domain licenses, with
          attribution shown on-card. Players without a photo use a simple placeholder graphic.
        </p>
      </Panel>
    </div>
  );
}
