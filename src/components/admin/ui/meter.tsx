import { cn } from "@/lib/utils";
import { formatPercent } from "@/components/admin/charts/geometry";

interface MeterProps {
  label: string;
  /** Valeur consommée et plafond, dans la même unité. */
  value: number;
  max: number;
  /** Rendu des deux bornes (ex. montant en dollars). */
  format: (v: number) => string;
  className?: string;
}

/**
 * Jauge de consommation (budget IA jour/mois). Séquentiel à une seule teinte :
 * la couleur ne dit pas « quelle série », elle dit « quelle intensité » — et
 * bascule sur les couleurs de statut aux seuils, toujours doublée d'un libellé.
 */
export function Meter({ label, value, max, format, className }: MeterProps) {
  const ratio = max > 0 ? Math.min(value / max, 1) : 0;
  const overflowed = max > 0 && value >= max;
  const near = ratio >= 0.8;

  const barTone = overflowed ? "bg-destructive" : near ? "bg-warning" : "bg-action";
  const state = overflowed ? "Plafond atteint" : near ? "Seuil proche" : "Sous le plafond";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {format(value)} / {format(max)}
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-valuenow={Math.round(ratio * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} : ${formatPercent(ratio)} du plafond — ${state}`}
      >
        {/* transform plutôt que width : pas de reflow pendant la transition. */}
        <div
          className={cn("h-full origin-left rounded-full transition-transform duration-500", barTone)}
          style={{ transform: `scaleX(${ratio})`, width: "100%" }}
        />
      </div>
      <p
        className={cn(
          "text-xs",
          overflowed ? "text-destructive" : near ? "text-warning" : "text-muted-foreground",
        )}
      >
        {state} · {formatPercent(ratio)}
      </p>
    </div>
  );
}
