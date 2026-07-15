interface AvatarProps {
  className?: string;
}

// Simple static placeholder for players with no image_url (or a broken one).
// Intentionally has no per-player variation — just a plain silhouette with a
// "?" — this replaces the old illustrated SVG avatar system (body/hair/pose/
// skin-tone variants), which added maintenance burden for no real benefit.
export function PlayerAvatar({ className = '' }: AvatarProps) {
  return (
    <svg viewBox="0 0 300 400" className={className} preserveAspectRatio="xMidYMid slice">
      <rect width="300" height="400" fill="#12161d" />

      {/* Plain human silhouette */}
      <circle cx="150" cy="140" r="55" fill="#232a35" />
      <path
        d="M 60 400 L 70 300 Q 75 250 150 245 Q 225 250 230 300 L 240 400 Z"
        fill="#232a35"
      />

      {/* Large centered "?" */}
      <text
        x="150"
        y="205"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="130"
        fontWeight="700"
        fill="#5a6578"
        fontFamily="sans-serif"
      >
        ?
      </text>
    </svg>
  );
}
