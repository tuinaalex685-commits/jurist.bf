import { cn } from "@/lib/utils";

interface RankInsigniaProps {
  /** 1..5 — Néophyte, Initié, Praticien, Plaideur, Maître */
  level: number;
  size?: number;
  className?: string;
}

const ROMAN = ["I", "II", "III", "IV", "V"];

/** Insigne de rang — écusson émeraude à liseré doré, chiffre romain gravé. */
export function RankInsignia({ level, size = 44, className }: RankInsigniaProps) {
  const id = `rank-${level}`;
  const numeral = ROMAN[Math.max(0, Math.min(4, level - 1))];

  return (
    <svg
      width={size}
      height={(size * 110) / 100}
      viewBox="0 0 100 110"
      role="img"
      aria-label={`Rang ${numeral}`}
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#12BE86" />
          <stop offset="100%" stopColor="#0A7350" />
        </linearGradient>
      </defs>
      <path
        d="M50 5 L87 19 L87 55 Q87 87 50 104 Q13 87 13 55 L13 19 Z"
        fill={`url(#${id})`}
        stroke="#E7C878"
        strokeWidth="3"
      />
      <path
        d="M50 14 L79 25 L79 54 Q79 79 50 93 Q21 79 21 54 L21 25 Z"
        fill="none"
        stroke="#E7C878"
        strokeWidth="1"
        opacity="0.5"
      />
      <text
        x="50"
        y="60"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Fraunces, Georgia, serif"
        fontWeight="700"
        fontSize="34"
        fill="#F6EED2"
      >
        {numeral}
      </text>
    </svg>
  );
}
