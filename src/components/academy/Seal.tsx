import { cn } from "@/lib/utils";

interface SealProps {
  size?: number;
  locked?: boolean;
  className?: string;
  title?: string;
}

/**
 * Le Sceau — objet-signature de Jurist BF. Médaillon doré (cachet de maîtrise),
 * bord monnayé, balance de la justice gravée au centre. Version verrouillée en nuit.
 */
export function Seal({ size = 64, locked = false, className, title }: SealProps) {
  const notches = Array.from({ length: 40 });
  const id = "seal-gold";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={title ?? (locked ? "Sceau verrouillé" : "Sceau de maîtrise")}
      className={cn("shrink-0", className)}
    >
      <defs>
        <radialGradient id={id} cx="38%" cy="32%" r="72%">
          <stop offset="0%" stopColor="#F6E4B0" />
          <stop offset="45%" stopColor="#DFB863" />
          <stop offset="100%" stopColor="#A9832F" />
        </radialGradient>
        <linearGradient id={`${id}-lock`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1B2740" />
          <stop offset="100%" stopColor="#0E1626" />
        </linearGradient>
      </defs>

      {/* bord monnayé */}
      {notches.map((_, i) => {
        const a = (i / notches.length) * Math.PI * 2;
        const x1 = 50 + Math.cos(a) * 45;
        const y1 = 50 + Math.sin(a) * 45;
        const x2 = 50 + Math.cos(a) * 49;
        const y2 = 50 + Math.sin(a) * 49;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={locked ? "#28324d" : "#8A6A22"}
            strokeWidth={2}
            strokeLinecap="round"
          />
        );
      })}

      {/* corps du sceau */}
      <circle cx="50" cy="50" r="44" fill={locked ? `url(#${id}-lock)` : `url(#${id})`} />
      <circle cx="50" cy="50" r="37" fill="none" stroke={locked ? "#33405e" : "#8A6A22"} strokeWidth="1.5" opacity="0.8" />
      <circle cx="50" cy="50" r="34" fill="none" stroke={locked ? "#48577a" : "#F4E6BC"} strokeWidth="1" opacity="0.6" />

      {locked ? (
        /* cadenas */
        <g stroke="#6B7A9B" strokeWidth="2.4" fill="none" strokeLinecap="round">
          <rect x="41" y="49" width="18" height="15" rx="3" fill="#6B7A9B" stroke="none" />
          <path d="M44 49 v-4 a6 6 0 0 1 12 0 v4" />
        </g>
      ) : (
        /* balance de la justice */
        <g stroke="#4A3A12" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <circle cx="50" cy="34" r="1.8" fill="#4A3A12" stroke="none" />
          <line x1="50" y1="36" x2="50" y2="62" />
          <line x1="35" y1="40" x2="65" y2="40" />
          {/* pans */}
          <line x1="35" y1="40" x2="30" y2="52" />
          <line x1="35" y1="40" x2="40" y2="52" />
          <path d="M29 52 Q35 60 41 52" />
          <line x1="65" y1="40" x2="60" y2="52" />
          <line x1="65" y1="40" x2="70" y2="52" />
          <path d="M59 52 Q65 60 71 52" />
          {/* socle */}
          <line x1="43" y1="64" x2="57" y2="64" />
        </g>
      )}
    </svg>
  );
}
