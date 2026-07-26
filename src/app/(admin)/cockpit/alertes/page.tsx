import Link from "next/link";
import { AlertTriangle, Info, ShieldAlert, CheckCircle2 } from "lucide-react";
import { requireAdminPage } from "@/server/modules/admin/guard";
import { listAlerts } from "@/server/modules/admin/service";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AlertActions } from "@/components/admin/alert-actions";
import { formatInt } from "@/components/admin/charts/geometry";
import { cn } from "@/lib/utils";
import type { AlertSeverity } from "@/server/contracts/admin";

export const dynamic = "force-dynamic";

/** Statut = icône + libellé + couleur. Jamais la couleur seule. */
const SEVERITY: Record<AlertSeverity, { label: string; icon: typeof Info; box: string; text: string }> = {
  info: { label: "Information", icon: Info, box: "border-border", text: "text-muted-foreground" },
  warning: { label: "Avertissement", icon: AlertTriangle, box: "border-warning/40 bg-warning/5", text: "text-warning" },
  critical: { label: "Critique", icon: ShieldAlert, box: "border-destructive/40 bg-destructive/5", text: "text-destructive" },
};

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const sp = await searchParams;
  const includeResolved = (Array.isArray(sp.resolues) ? sp.resolues[0] : sp.resolues) === "1";

  const alerts = await listAlerts({ includeResolved, limit: 50 });

  return (
    <>
      <PageHeader
        title="Alertes système"
        description="Levées automatiquement par le moniteur, dédupliquées par cause : une panne répétée compte les occurrences plutôt que d'inonder la liste."
        action={
          <Link
            href={includeResolved ? "/cockpit/alertes" : "/cockpit/alertes?resolues=1"}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            {includeResolved ? "Masquer les alertes closes" : "Afficher les alertes closes"}
          </Link>
        }
      />

      {alerts.length === 0 ? (
        <div className="hall flex flex-col items-center gap-3 px-6 py-14 text-center">
          <CheckCircle2 className="h-8 w-8 text-action" />
          <p className="font-display text-base font-semibold text-foreground">Aucune alerte ouverte</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Le moniteur n&apos;a rien signalé : budget sous contrôle, file qui avance, coupe-circuit refermé.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {alerts.map((a) => {
            const tone = SEVERITY[a.severity];
            const Icon = tone.icon;
            const resolved = Boolean(a.resolvedAt);

            return (
              <li
                key={a.id}
                className={cn("hall flex flex-wrap items-start gap-4 p-5", !resolved && tone.box, resolved && "opacity-60")}
              >
                <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", resolved ? "text-muted-foreground" : tone.text)} />

                <div className="min-w-[16rem] flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-sm font-semibold text-foreground">{a.title}</h2>
                    <span className={cn("font-mono text-[11px] uppercase tracking-wider", tone.text)}>{tone.label}</span>
                    {a.occurrences > 1 && (
                      <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                        ×{formatInt(a.occurrences)}
                      </span>
                    )}
                    {resolved && <span className="font-mono text-[11px] text-action">close</span>}
                    {!resolved && a.acknowledgedAt && (
                      <span className="font-mono text-[11px] text-muted-foreground">vue</span>
                    )}
                  </div>

                  {a.body && <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>}

                  <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                    {a.kind} · première fois {new Date(a.firstSeenAt).toLocaleString("fr-FR")} · dernière{" "}
                    {new Date(a.lastSeenAt).toLocaleString("fr-FR")}
                  </p>
                </div>

                {!resolved && <AlertActions alertId={a.id} acknowledged={Boolean(a.acknowledgedAt)} />}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
