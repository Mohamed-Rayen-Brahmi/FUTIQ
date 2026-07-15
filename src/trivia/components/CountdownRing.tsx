import { useEffect, useRef } from 'react';

interface CountdownRingProps {
  totalSeconds: number;
  remainingSeconds: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  urgentColor?: string;
  urgentThreshold?: number;
}

export function CountdownRing({
  totalSeconds,
  remainingSeconds,
  size = 72,
  strokeWidth = 5,
  color = '#d8b458',
  urgentColor = '#ff5b3d',
  urgentThreshold = 10,
}: CountdownRingProps) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, remainingSeconds / totalSeconds));
  const dashOffset = circumference * (1 - progress);
  const isUrgent = remainingSeconds <= urgentThreshold;
  const activeColor = isUrgent ? urgentColor : color;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)' }}
        className="absolute inset-0"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1e2a36"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={activeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.95s linear, stroke 0.3s ease' }}
        />
      </svg>
      <span
        className="font-display text-2xl leading-none font-semibold relative z-10"
        style={{ color: activeColor, transition: 'color 0.3s ease' }}
      >
        {Math.ceil(remainingSeconds)}
      </span>
    </div>
  );
}

/** Hook that counts down from `totalSeconds`, calling `onExpire` at zero. */
export function useCountdown(totalSeconds: number, active: boolean, onExpire?: () => void) {
  const endTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const expiredRef = useRef(false);
  const callbackRef = useRef(onExpire);
  callbackRef.current = onExpire;

  // We don't store state here — the caller uses phase_ends_at from the DB
  // to compute the remaining seconds, so this hook is only used for display.
  // The actual timer is driven by useTriviaRoom / useTriviaSolo.

  useEffect(() => {
    if (!active) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    endTimeRef.current = Date.now() + totalSeconds * 1000;
    expiredRef.current = false;

    function tick() {
      const remaining = Math.max(0, (endTimeRef.current! - Date.now()) / 1000);
      if (remaining <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        callbackRef.current?.();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, totalSeconds]);
}

/** Derives remaining seconds from an ISO phase_ends_at timestamp. */
export function usePhaseCountdown(phaseEndsAt: string | null | undefined): number {
  const [remaining, setRemaining] = useReactState(0);

  useEffect(() => {
    if (!phaseEndsAt) { setRemaining(0); return; }
    const update = () => {
      const r = Math.max(0, (new Date(phaseEndsAt).getTime() - Date.now()) / 1000);
      setRemaining(r);
    };
    update();
    const id = setInterval(update, 500);
    return () => clearInterval(id);
  }, [phaseEndsAt]);

  return remaining;
}

// Local re-export to avoid top-level import cycle
import { useState as useReactState } from 'react';
