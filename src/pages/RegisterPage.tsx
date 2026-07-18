import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { SkewButton, Panel } from '../components/ui';
import { Chrome } from 'lucide-react';

export function RegisterPage() {
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signUp(email, password, username);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      setSuccessMsg(true);
    }
  }, [signUp, email, password, username]);

  const handleGoogle = useCallback(async () => {
    setError(null);
    const { error } = await signInWithGoogle();
    if (error) setError(error);
  }, [signInWithGoogle]);

  if (successMsg) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <h1 className="font-display text-5xl text-gold text-center mb-2 text-glow-gold">GOLAZIO</h1>
        <p className="font-label text-sm uppercase tracking-widest text-slate-500 text-center mb-8">Account Created</p>
        <Panel className="p-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-match-green/20 text-match-green flex items-center justify-center mb-6">
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="font-display text-2xl text-slate-100 mb-2">Check Your Email</h2>
          <p className="font-body text-slate-400 mb-6">
            We've sent a verification link to <strong className="text-slate-200">{email}</strong>. 
            Please check your inbox and verify your email address to activate your account.
          </p>
          <SkewButton variant="gold" onClick={() => navigate('/login')} className="w-full">
            Go to Login
          </SkewButton>
        </Panel>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="font-display text-5xl text-gold text-center mb-2 text-glow-gold">GOLAZIO</h1>
      <p className="font-label text-sm uppercase tracking-widest text-slate-500 text-center mb-8">Create Account</p>

      <Panel className="p-6">
        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 rounded-lg px-4 py-2.5 font-label text-sm text-slate-800 hover:bg-slate-50 transition-colors"
        >
          <Chrome size={18} className="text-slate-700" />
          Continue with Google
        </button>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-ink-border" />
          <span className="font-label text-xs uppercase tracking-wider text-slate-600">or</span>
          <div className="flex-1 h-px bg-ink-border" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="font-label text-xs uppercase tracking-wider text-slate-500 mb-1 block">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={2}
              maxLength={20}
              pattern="[a-zA-Z0-9_]+"
              className="w-full bg-ink-deep border border-ink-border rounded-lg px-4 py-2.5 font-body text-slate-200 focus:outline-none focus:border-gold transition-colors"
            />
            <p className="font-body text-xs text-slate-600 mt-1">2-20 characters, letters/numbers/underscores only</p>
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
            <label className="font-label text-xs uppercase tracking-wider text-slate-500 mb-1 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-ink-deep border border-ink-border rounded-lg px-4 py-2.5 font-body text-slate-200 focus:outline-none focus:border-gold transition-colors"
            />
            <p className="font-body text-xs text-slate-600 mt-1">Minimum 6 characters</p>
          </div>

          {error && (
            <p className="font-body text-sm text-cta bg-cta/10 border border-cta/30 rounded px-3 py-2">
              {error}
            </p>
          )}

          <SkewButton variant="gold" type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating...' : 'Create Account'}
          </SkewButton>
        </form>

        <p className="font-body text-sm text-slate-500 text-center mt-4">
          Already have an account? <Link to="/login" className="text-gold hover:underline">Sign in</Link>
        </p>
      </Panel>
    </div>
  );
}
