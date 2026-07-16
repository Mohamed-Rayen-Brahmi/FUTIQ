import { Panel } from '../components/ui';
import { AdBanner } from '../components/AdBanner';

export function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-display text-4xl text-gold mb-6">Terms of Service</h1>
      <AdBanner dataAdSlot="terms-top" />

      <Panel className="p-6 mb-4">
        <h2 className="font-display text-2xl text-slate-200 mb-3">1. Acceptance of Terms</h2>
        <p className="font-body text-slate-400">
          By accessing and playing Golazio, you accept and agree to be bound by the terms and provision of this agreement.
        </p>
      </Panel>

      <Panel className="p-6 mb-4">
        <h2 className="font-display text-2xl text-slate-200 mb-3">2. Intellectual Property</h2>
        <p className="font-body text-slate-400 mb-3">
          Golazio is an unofficial fan-made game. All player names, likenesses, club crests, and statistical data are the property of their respective owners. We do not claim ownership of these assets. 
        </p>
        <p className="font-body text-slate-400">
          The original game mechanics, code, and unique UI design of Golazio are the property of the Golazio team.
        </p>
      </Panel>

      <Panel className="p-6 mb-4">
        <h2 className="font-display text-2xl text-slate-200 mb-3">3. User Conduct</h2>
        <p className="font-body text-slate-400 mb-3">
          Players must not:
        </p>
        <ul className="font-body text-slate-400 list-disc list-inside space-y-1 mb-3">
          <li>Use automated scripts or bots to exploit the game or inflate rankings.</li>
          <li>Engage in abusive behavior in multiplayer trivia rooms.</li>
          <li>Attempt to gain unauthorized access to our database or other users' accounts.</li>
        </ul>
        <p className="font-body text-slate-400">
          We reserve the right to suspend or terminate accounts that violate these rules.
        </p>
      </Panel>

      <Panel className="p-6 mb-4">
        <h2 className="font-display text-2xl text-slate-200 mb-3">4. Limitation of Liability</h2>
        <p className="font-body text-slate-400">
          Golazio is provided "as is" without any warranties. We are not responsible for any interruptions in service, data loss, or issues caused by third-party advertisements or services.
        </p>
      </Panel>
      
      <Panel className="p-6">
        <h2 className="font-display text-2xl text-slate-200 mb-3">5. Contact</h2>
        <p className="font-body text-slate-400">
          If you have any questions about these Terms, please contact us at <a href="mailto:contact@golazio.me" className="text-gold hover:underline">contact@golazio.me</a>.
        </p>
      </Panel>
    </div>
  );
}
