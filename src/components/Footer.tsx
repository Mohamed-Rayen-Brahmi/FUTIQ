import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="mt-auto py-8 border-t border-ink-border bg-ink-base/50">
      <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row items-center gap-4 text-sm text-slate-500 font-label uppercase tracking-wide">
          <span>&copy; {new Date().getFullYear()} Golazio</span>
        </div>
        
        <nav className="flex items-center gap-6">
          <Link to="/about" className="text-sm font-label uppercase tracking-wide text-slate-500 hover:text-gold transition-colors">
            About
          </Link>
          <Link to="/privacy" className="text-sm font-label uppercase tracking-wide text-slate-500 hover:text-gold transition-colors">
            Privacy Policy
          </Link>
          <Link to="/contact" className="text-sm font-label uppercase tracking-wide text-slate-500 hover:text-gold transition-colors">
            Contact
          </Link>
        </nav>
      </div>
    </footer>
  );
}
