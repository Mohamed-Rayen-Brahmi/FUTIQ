import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { SkewButton } from './ui';
import { LogOut, User } from 'lucide-react';

export function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-ink-base/90 backdrop-blur-sm border-b border-ink-border">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-display text-3xl leading-none text-gold text-glow-gold tracking-tight">
            FUTIQ
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-4">
          <Link to="/trivia" className="font-label text-sm uppercase tracking-wide text-cta hover:text-cta-light transition-colors hidden sm:inline flex items-center gap-1">
            🎭 Party
          </Link>
          <Link to="/about" className="font-label text-sm uppercase tracking-wide text-slate-500 hover:text-gold transition-colors hidden sm:inline">
            About
          </Link>
          {user ? (
            <>
              <Link to="/profile" className="flex items-center gap-1.5 font-label text-sm uppercase tracking-wide text-slate-300 hover:text-gold transition-colors">
                <User size={16} />
                <span className="hidden sm:inline">Profile</span>
              </Link>
              <button
                onClick={async () => { await signOut(); navigate('/'); }}
                className="flex items-center gap-1.5 font-label text-sm uppercase tracking-wide text-slate-500 hover:text-cta transition-colors"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login">
                <SkewButton variant="ghost" size="sm">Sign In</SkewButton>
              </Link>
              <Link to="/register">
                <SkewButton variant="gold" size="sm">Sign Up</SkewButton>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
