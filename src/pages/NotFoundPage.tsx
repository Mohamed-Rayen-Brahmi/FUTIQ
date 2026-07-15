import { Link } from 'react-router-dom';
import { SkewButton } from '../components/ui';

export function NotFoundPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <h1 className="font-display text-8xl text-gold text-glow-gold mb-2">404</h1>
      <p className="font-label text-lg uppercase tracking-widest text-slate-500 mb-8">Off the pitch</p>
      <Link to="/">
        <SkewButton variant="gold">Back to Game</SkewButton>
      </Link>
    </div>
  );
}
