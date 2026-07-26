"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_BOX,
  FORMATTERS,
  areaPath,
  buildScales,
  formatDayLong,
  formatDayShort,
  linePath,
  nearestIndex,
  type FormatKind,
} from "./geometry";
import { SERIES_FILL, SERIES_STROKE, SERIES_TEXT, type SeriesTone } from "./series";

export interface TrendPoint {
  day: string;
  value: number;
}

interface TrendChartProps {
  points: TrendPoint[];
  /** Nomme la série : un graphique mono-série n'a pas besoin de légende, le titre suffit. */
  label: string;
  tone?: SeriesTone;
  /** NOM du format (pas la fonction : elle ne traverserait pas la frontière serveur → client). */
  format?: FormatKind;
  className?: string;
}

/**
 * Courbe d'évolution (aire + trait) avec curseur de survol.
 *
 * Une seule série par graphique, volontairement : le cockpit compare des
 * grandeurs d'unités différentes (utilisateurs, $, décomptes) — les superposer
 * exigerait deux axes Y, ce qui rend un graphique illisible.
 */
export function TrendChart({ points, label, tone = "emerald", format = "compact", className }: TrendChartProps) {
  const [hover, setHover] = React.useState<number | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const box = DEFAULT_BOX;
  const fmt = FORMATTERS[format];

  const values = React.useMemo(() => points.map((p) => p.value), [points]);
  const scales = React.useMemo(
    () => buildScales(values.length, Math.max(...values, 0), box),
    [values, box],
  );

  const handleMove = React.useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return;
      // px écran → unités du viewBox → fraction de la zone utile.
      const svgX = ((event.clientX - rect.left) / rect.width) * box.width;
      const fraction = (svgX - box.padLeft) / scales.innerWidth;
      setHover(nearestIndex(fraction, points.length));
    },
    [box, scales.innerWidth, points.length],
  );

  if (points.length === 0) return <EmptyPlot className={className} />;

  const active = hover !== null ? points[hover] : null;
  const activeX = hover !== null ? scales.x(hover) : 0;

  return (
    <figure className={cn("relative", className)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${box.width} ${box.height}`}
        className="h-auto w-full touch-none"
        role="img"
        aria-label={`${label} — évolution sur ${points.length} jours`}
        onPointerMove={handleMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`trend-fade-${tone}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grille horizontale : discrète, en retrait du trait de données. */}
        {scales.ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={box.padLeft}
              x2={box.width - box.padRight}
              y1={scales.y(tick)}
              y2={scales.y(tick)}
              className="stroke-border"
              strokeWidth={1}
            />
            <text
              x={box.padLeft - 8}
              y={scales.y(tick) + 4}
              textAnchor="end"
              className="fill-muted-foreground font-mono text-[11px]"
            >
              {fmt(tick)}
            </text>
          </g>
        ))}

        {/* Le dégradé est bâti sur `currentColor` : c'est la couleur de texte de
            ce <path> qui porte la teinte de la série. */}
        <path d={areaPath(values, scales)} className={SERIES_TEXT[tone]} fill={`url(#trend-fade-${tone})`} />
        <path
          d={linePath(values, scales)}
          fill="none"
          className={SERIES_STROKE[tone]}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Repères d'abscisse : premier, milieu, dernier — jamais une étiquette par point. */}
        {[0, Math.floor((points.length - 1) / 2), points.length - 1]
          .filter((i, idx, arr) => i >= 0 && arr.indexOf(i) === idx)
          .map((i) => (
            <text
              key={i}
              x={scales.x(i)}
              y={box.height - 8}
              textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
              className="fill-muted-foreground font-mono text-[11px]"
            >
              {formatDayShort(points[i].day)}
            </text>
          ))}

        {active && (
          <g>
            <line
              x1={activeX}
              x2={activeX}
              y1={box.padTop}
              y2={scales.baseline}
              className="stroke-foreground/25"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            {/* Anneau de surface : le marqueur reste lisible par-dessus l'aire. */}
            <circle cx={activeX} cy={scales.y(active.value)} r={5.5} className="fill-background" />
            <circle cx={activeX} cy={scales.y(active.value)} r={4} className={SERIES_FILL[tone]} />
          </g>
        )}
      </svg>

      {active && (
        <div
          className="glass pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-lg px-3 py-2 shadow-sm"
          style={{ left: `${(activeX / box.width) * 100}%` }}
          role="status"
          aria-live="polite"
        >
          <p className="whitespace-nowrap text-[11px] text-muted-foreground">{formatDayLong(active.day)}</p>
          <p className="whitespace-nowrap font-mono text-sm font-semibold text-foreground">{fmt(active.value)}</p>
        </div>
      )}

      {/* Équivalent tabulaire — le graphique n'est jamais le seul accès à la donnée. */}
      <figcaption className="sr-only">
        <table>
          <caption>{label}</caption>
          <thead>
            <tr>
              <th scope="col">Jour</th>
              <th scope="col">{label}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.day}>
                <th scope="row">{formatDayLong(p.day)}</th>
                <td>{fmt(p.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}

export function EmptyPlot({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-[240px] items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground",
        className,
      )}
    >
      Aucune donnée sur la période
    </div>
  );
}
