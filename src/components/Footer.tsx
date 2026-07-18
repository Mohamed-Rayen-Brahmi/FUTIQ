import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="mt-auto py-12 border-t border-ink-border bg-ink-panel relative z-10">
      <div className="max-w-5xl mx-auto px-4">
        
        {/* SEO Rich Text Section */}
        <div className="mb-8 pb-8 border-b border-ink-border/50 text-center md:text-left">
          <h2 className="font-display text-xl text-slate-200 mb-3">
            About Golazio: The Daily Football Dle Game
          </h2>
          <p className="font-body text-sm text-slate-400 leading-relaxed max-w-4xl">
            Welcome to <strong className="text-cta font-medium">Golazio</strong>, the internet's ultimate football dle and daily guessing game. 
            Whether you are here to guess the footballer in our daily grid puzzle, test your soccer knowledge in our multiplayer trivia party mode, 
            or climb the global leaderboards, Golazio is the definitive destination for football fans. Challenge your friends, solve the daily soccer puzzles, 
            and prove your knowledge every single day.
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-4 text-sm text-slate-500 font-label uppercase tracking-wide">
            <span>&copy; {new Date().getFullYear()} Golazio</span>
          </div>
          
          <nav className="flex flex-wrap items-center justify-center gap-6">
            <Link to="/about" className="text-sm font-label uppercase tracking-wide text-slate-500 hover:text-gold transition-colors">
              About
            </Link>
            <Link to="/terms" className="text-sm font-label uppercase tracking-wide text-slate-500 hover:text-gold transition-colors">
              Terms of Service
            </Link>
            <Link to="/privacy" className="text-sm font-label uppercase tracking-wide text-slate-500 hover:text-gold transition-colors">
              Privacy Policy
            </Link>
            <Link to="/contact" className="text-sm font-label uppercase tracking-wide text-slate-500 hover:text-gold transition-colors">
              Contact
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
