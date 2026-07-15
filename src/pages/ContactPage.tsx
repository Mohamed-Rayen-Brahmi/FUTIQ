import { useState, useCallback } from 'react';
import { SkewButton, Panel } from '../components/ui';
import { AdBanner } from '../components/AdBanner';

export function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    // No backend — just show confirmation
    setSent(true);
    setName('');
    setEmail('');
    setMessage('');
  }, []);

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h1 className="font-display text-4xl text-gold mb-6">Contact</h1>
      <AdBanner dataAdSlot="contact-top" />

      {sent ? (
        <Panel className="p-6 text-center">
          <p className="font-display text-2xl text-match-green mb-2">Message Sent</p>
          <p className="font-body text-slate-400">Thanks for reaching out!</p>
        </Panel>
      ) : (
        <Panel className="p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="font-label text-xs uppercase tracking-wider text-slate-500 mb-1 block">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-ink-deep border border-ink-border rounded-lg px-4 py-2.5 font-body text-slate-200 focus:outline-none focus:border-gold transition-colors"
              />
            </div>
            <div>
              <label className="font-label text-xs uppercase tracking-wider text-slate-500 mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-ink-deep border border-ink-border rounded-lg px-4 py-2.5 font-body text-slate-200 focus:outline-none focus:border-gold transition-colors"
              />
            </div>
            <div>
              <label className="font-label text-xs uppercase tracking-wider text-slate-500 mb-1 block">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={4}
                className="w-full bg-ink-deep border border-ink-border rounded-lg px-4 py-2.5 font-body text-slate-200 focus:outline-none focus:border-gold transition-colors resize-none"
              />
            </div>
            <SkewButton variant="gold" type="submit" className="w-full">
              Send Message
            </SkewButton>
          </form>
        </Panel>
      )}
    </div>
  );
}
