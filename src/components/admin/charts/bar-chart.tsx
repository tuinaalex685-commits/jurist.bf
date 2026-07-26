"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_BOX,
  FORMATTERS,
  bandCenter,
  buildScales,
  formatDayLong,
  formatDayShort,
  type FormatKind,
} from "./geometry";
import { SERIES_FILL, type SeriesTone } from "./series";
import { EmptyPlot } from "./trend-chart";

export interface BarPoint {
  day: string;
  value: number;
}

interface BarChartProps {
  points: BarPoint[];
  label: string;
  tone?: SeriesTone;
  /** NOM du format (pas la fonction : elle ne traverserait pas la frontière serveur → client). */
  format?: FormatKind;
  className?: string;
}

/** Barres journalières (volumes discrets : coût quotidien, générations, examens). */
export function BarChart({ points, label, tone = "indigo", format = "compact", className }: BarChartProps) {
  const [hover, setHover] = React.useState<number | null>(null);
  const box = DEFAULT_BOX;
  const fmt = FORMATTERS[format];

  const values = React.useMemo(() => points.map((p) => p.value), [points]);
  const scales = React.useMemo(() => buildScales(values.length, Math.max(...values, 0), box), [values, box]);

  if (points.length === 0) return <EmptyPlot className={className} />;

  // 2px d'écart de surface entre barres voisines ; jamais moins de 2px de large.
  const barWidth = Math.max(2, scales.bandWidth - 2);
  const active = hover !== null ? points[hover] : null;

  return (
    <figure className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${box.width} ${box.height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${label} — ${points.length} jours`}
        onPointerLeave={() => setHover(null)}
      >
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

        {points.map((p, i) => {
          const cx = bandCenter(i, box, scales);
          const top = scales.y(p.value);
          const height = Math.max(0, scales.baseline - top);
          return (
            <g key={p.day} onPointerEnter={() => setHover(i)}>
              {/* Cible de survol pleine hauteur : plus large que la barre elle-même. */}
              <rect
                x={cx - scales.bandWidth / 2}
                y={box.padTop}
                width={scales.bandWidth}
                height={scales.innerHeight}
                fill="transparent"
              />
              <rect
                x={cx - barWidth / 2}
                y={top}
                width={barWidth}
                height={height}
                rx={Math.min(4, barWidth / 2)}
                className={cn(SERIES_FILL[tone], "transition-opacity")}
                opacity={hover === null || hover === i ? 1 : 0.45}
              />
            </g>
          );
        })}

        {[0, Math.floor((points.length - 1) / 2), points.length - 1]
          .filter((i, idx, arr) => i >= 0 && arr.indexOf(i) === idx)
          .map((i) => (
            <text
              key={i}
              x={bandCenter(i, box, scales)}
              y={box.height - 8}
              textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
              className="fill-muted-foreground font-mono text-[11px]"
            >
              {formatDayShort(points[i].day)}
            </text>
          ))}
      </svg>

      {active && hover !== null && (
        <div
          className="glass pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-lg px-3 py-2 shadow-sm"
          style={{ left: `${(bandCenter(hover, box, scales) / box.width) * 100}%` }}
          role="status"
          aria-live="polite"
        >
          <p className="whitespace-nowrap text-[11px] text-muted-foreground">{formatDayLong(active.day)}</p>
          <p className="whitespace-nowrap font-mono text-sm font-semibold text-foreground">{fmt(active.value)}</p>
        </div>
      )}

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
