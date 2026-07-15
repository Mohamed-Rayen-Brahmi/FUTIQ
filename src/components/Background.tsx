export function Background({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Base */}
      <div className="fixed inset-0 bg-ink-base -z-50" />

      {/* Floodlight glows */}
      <div
        className="fixed -top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full -z-40"
        style={{
          background: 'radial-gradient(circle, rgba(216,180,88,0.06) 0%, transparent 70%)',
        }}
      />
      <div
        className="fixed -top-1/4 -right-1/4 w-[600px] h-[600px] rounded-full -z-40"
        style={{
          background: 'radial-gradient(circle, rgba(255,91,61,0.04) 0%, transparent 70%)',
        }}
      />

      {/* Vignette */}
      <div
        className="fixed inset-0 -z-30 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.5) 100%)',
        }}
      />

      {/* Grain overlay */}
      <svg
        className="fixed inset-0 w-full h-full -z-30 pointer-events-none"
        style={{ opacity: 0.035 }}
        aria-hidden="true"
      >
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
