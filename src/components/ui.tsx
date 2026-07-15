import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface SkewButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'gold' | 'cta' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function SkewButton({
  children,
  variant = 'gold',
  size = 'md',
  className = '',
  ...props
}: SkewButtonProps) {
  const variants = {
    gold: 'bg-gold text-ink-base hover:bg-gold-light',
    cta: 'bg-cta text-white hover:bg-cta-light',
    ghost: 'bg-transparent border border-ink-border text-slate-300 hover:border-gold hover:text-gold',
  };
  const sizes = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-5 py-2 text-base',
    lg: 'px-7 py-3 text-lg',
  };
  return (
    <button
      className={`skew-parallelogram font-label font-semibold uppercase tracking-wide transition-colors duration-200 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      <span className="skew-inner">{children}</span>
    </button>
  );
}

interface SkewBadgeProps {
  children: ReactNode;
  color?: 'gold' | 'green' | 'amber' | 'gray' | 'cta';
  className?: string;
}

export function SkewBadge({ children, color = 'gold', className = '' }: SkewBadgeProps) {
  const colors = {
    gold: 'bg-gold/15 text-gold border-gold/30',
    green: 'bg-match-green/15 text-match-green border-match-green/30',
    amber: 'bg-match-amber/15 text-match-amber border-match-amber/30',
    gray: 'bg-match-gray/15 text-slate-400 border-match-gray/30',
    cta: 'bg-cta/15 text-cta border-cta/30',
  };
  return (
    <span className={`skew-parallelogram border font-label text-xs font-semibold uppercase tracking-wider ${colors[color]} ${className}`}>
      <span className="skew-inner px-2 py-0.5">{children}</span>
    </span>
  );
}

interface StatPillProps {
  label: string;
  value: ReactNode;
  className?: string;
}

export function StatPill({ label, value, className = '' }: StatPillProps) {
  return (
    <div className={`panel-surface px-3 py-2 ${className}`}>
      <div className="font-label text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className="font-display text-2xl leading-none text-slate-100">{value}</div>
    </div>
  );
}

interface PanelProps {
  children: ReactNode;
  className?: string;
}

export function Panel({ children, className = '' }: PanelProps) {
  return <div className={`panel-surface ${className}`}>{children}</div>;
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`inline-block animate-spin rounded-full border-2 border-ink-border border-t-gold ${className}`} style={{ width: '1em', height: '1em' }} />
  );
}

export function EmptyState({ message, sub }: { message: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="font-label text-lg text-slate-400 uppercase tracking-wide">{message}</p>
      {sub && <p className="font-body text-sm text-slate-600 mt-1">{sub}</p>}
    </div>
  );
}
