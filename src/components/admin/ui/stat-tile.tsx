import * as React from "react";
import { cn } from "@/lib/utils";

type Status = "neutral" | "good" | "warning" | "critical";

/**
 * Couleurs de STATUT — réservées à l'état, jamais réutilisées comme couleur de
 * série. Toujours accompagnées d'un libellé : jamais l'information par la
 * couleur seule.
 */
const STATUS_RING: Record<Status, string> = {
  neutral: "",
  good: "ring-1 ring-action/25",
  warning: "ring-1 ring-warning/35",
  critical: "ring-1 ring-destructive/35",
};

const STATUS_TEXT: Record<Status, string> = {
  neutral: "text-muted-foreground",
  good: "text-action",
  warning: "text-warning",
  critical: "text-destructive",
};

interface StatTileProps {
  label: string;
  value: string;
  /** Précision sous la valeur (comparatif, décomposition). */
  hint?: string;
  status?: Status;
  /** Libellé d'état explicite — obligatoire dès que `status` n'est pas neutre. */
  statusLabel?: string;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Chiffre isolé : la bonne forme quand la donnée est UNE valeur. Pas de
 * graphique là où un nombre suffit.
 */
export function StatTile({ label, value, hint, status = "neutral", statusLabel, icon, className }: StatTileProps) {
  return (
    <div className={cn("hall flex flex-col justify-between gap-3 p-5", STATUS_RING[status], className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        {icon && <span className="shrink-0 text-muted-foreground/70">{icon}</span>}
      </div>
      <div>
        <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">{value}</p>
        {(hint || statusLabel) && (
          <p className={cn("mt-1 text-xs", statusLabel ? STATUS_TEXT[status] : "text-muted-foreground")}>
            {statusLabel ?? hint}
          </p>
        )}
        {statusLabel && hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}
