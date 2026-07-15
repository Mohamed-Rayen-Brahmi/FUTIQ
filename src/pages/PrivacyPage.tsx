import { Panel } from '../components/ui';
import { AdBanner } from '../components/AdBanner';

export function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-display text-4xl text-gold mb-6">Privacy Policy</h1>
      <AdBanner dataAdSlot="privacy-top" />

      <Panel className="p-6 mb-4">
        <h2 className="font-display text-2xl text-slate-200 mb-3">Local Storage & Cookies</h2>
        <p className="font-body text-slate-400 mb-3">
          FutIQ stores game state in a first-party cookie and in your browser's localStorage
          (written to both, for reliability):
        </p>
        <ul className="font-body text-slate-400 list-disc list-inside space-y-1 mb-3">
          <li><code className="text-gold">footdle:guest</code> — guest streak, games played/won, and banner state, kept for one year</li>
          <li><code className="text-gold">footdle:round:daily</code> / <code className="text-gold">footdle:round:training</code> / <code className="text-gold">footdle:round:unlimited</code> — in-progress round state per mode for refresh- and close-safety</li>
        </ul>
        <p className="font-body text-slate-400">
          When you create an account, guest data is migrated to your profile and the guest cache is cleared.
          Supabase Auth uses secure, HttpOnly cookies for session management. No third-party tracking cookies are used.
        </p>
      </Panel>

      <Panel className="p-6 mb-4">
        <h2 className="font-display text-2xl text-slate-200 mb-3">Account Data</h2>
        <p className="font-body text-slate-400">
          If you create an account, we store your username, streak, max streak, games played, games won,
          and game history. Passwords are handled entirely by Supabase Auth and are never stored in plaintext.
          Your data is protected by Supabase Row Level Security — you can only access your own profile and game history.
        </p>
      </Panel>

      <Panel className="p-6">
        <h2 className="font-display text-2xl text-slate-200 mb-3">Image Attribution & Licensing</h2>
        <p className="font-body text-slate-400 mb-3">
          Player photos are sourced exclusively from Wikidata/Wikimedia Commons, which hosts Creative Commons
          licensed or public-domain images. Each photo's license/attribution is stored with the player record
          and displayed as a small credit line on the card.
        </p>
        <p className="font-body text-slate-400">
          Players without a Wikidata photo use a simple static placeholder graphic — no external images
          are scraped or hotlinked from copyright-restricted sources.
        </p>
      </Panel>
    </div>
  );
}
