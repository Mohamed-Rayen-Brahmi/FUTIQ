import { Panel } from '../components/ui';
import { AdBanner } from '../components/AdBanner';
import { Mail } from 'lucide-react';

export function ContactPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h1 className="font-display text-4xl text-gold mb-6 text-center">Contact Us</h1>
      <AdBanner dataAdSlot="contact-top" />

      <Panel className="p-8 text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mb-6">
          <Mail className="w-8 h-8 text-gold" />
        </div>
        
        <h2 className="font-display text-2xl text-slate-200 mb-4">Get in Touch</h2>
        
        <p className="font-body text-slate-400 mb-8">
          Have a question, feedback, or need support? We'd love to hear from you. Send us an email directly!
        </p>

        <a 
          href="mailto:contact@golazio.me"
          className="inline-flex items-center gap-2 bg-gold hover:bg-gold-light text-ink-deep font-display text-lg px-8 py-4 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)]"
        >
          <Mail className="w-5 h-5" />
          contact@golazio.me
        </a>
      </Panel>
    </div>
  );
}
