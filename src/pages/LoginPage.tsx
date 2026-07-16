import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { SkewButton, Panel } from '../components/ui';
import { Chrome } from 'lucide-react';

export function LoginPage() {
  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      navigate('/');
    }
  }, [signIn, email, password, navigate]);

  const handleGoogle = useCallback(async () => {
    setError(null);
    const { error } = await signInWithGoogle();
    if (error) setError(error);
  }, [signInWithGoogle]);

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="font-display text-5xl text-gold text-center mb-2 text-glow-gold">GOLAZIO</h1>
      <p className="font-label text-sm uppercase tracking-widest text-slate-500 text-center mb-8">Sign In</p>

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
              className="w-full bg-ink-deep border border-ink-border rounded-lg px-4 py-2.5 font-body text-slate-200 focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          {error && (
            <p className="font-body text-sm text-cta bg-cta/10 border border-cta/30 rounded px-3 py-2">
              {error}
            </p>
          )}

          <SkewButton variant="gold" type="submit" disabled={loading} className="w-full">
            {loading ? 'Signing in...' : 'Sign In'}
          </SkewButton>
        </form>

        <p className="font-body text-sm text-slate-500 text-center mt-4">
          No account? <Link to="/register" className="text-gold hover:underline">Create one</Link>
        </p>
      </Panel>
    </div>
  );
}
