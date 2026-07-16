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
          Golazio stores game state in your browser's localStorage so you don't lose your progress if you refresh the page:
        </p>
        <ul className="font-body text-slate-400 list-disc list-inside space-y-1 mb-3">
          <li><code className="text-gold">golazio:guest</code> — guest streak, games played/won, kept locally on your device.</li>
          <li><code className="text-gold">golazio:round:*</code> — in-progress round states for Daily, Unlimited, Coaches, and Teams modes.</li>
        </ul>
        <p className="font-body text-slate-400">
          When you create an account, your guest data is migrated to your profile and securely saved to our database.
          Supabase Auth uses secure, HttpOnly cookies for session management.
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

      <Panel className="p-6 mb-4">
        <h2 className="font-display text-2xl text-slate-200 mb-3">Third-Party Services</h2>
        <p className="font-body text-slate-400 mb-3">
          We use Google AdSense to display advertisements. Google AdSense may use cookies and web beacons to serve ads based on your prior visits to our website or other websites. You can learn more about how Google uses information from sites that use their services in their Privacy & Terms.
        </p>
        <p className="font-body text-slate-400">
          We also use Supabase for authentication and database services, and Vercel for hosting our frontend.
        </p>
      </Panel>

      <Panel className="p-6">
        <h2 className="font-display text-2xl text-slate-200 mb-3">Image Attribution</h2>
        <p className="font-body text-slate-400">
          Player, coach, and team images are loaded from external CDNs and databases. Golazio does not claim ownership of any player likeness, club crest, or EA Sports FC 24 statistics. All trademarks and copyrights are the property of their respective owners.
        </p>
      </Panel>
    </div>
  );
}
