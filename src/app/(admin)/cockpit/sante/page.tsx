import { requireAdminPage } from "@/server/modules/admin/guard";
import { getJobsHealth, getOverview, listAudit } from "@/server/modules/admin/service";
import { PageHeader, SectionTitle } from "@/components/admin/ui/page-header";
import { StatTile } from "@/components/admin/ui/stat-tile";
import { DataTable, TableBody, TableEmpty, TableHead, TableRow, TableTd, TableTh } from "@/components/admin/ui/data-table";
import { formatDuration, formatInt } from "@/components/admin/charts/geometry";

export const dynamic = "force-dynamic";

const STALLED_QUEUE_S = 15 * 60;

/** Traduction des actions auditées — le journal doit être lisible sans décodeur. */
const ACTION_LABEL: Record<string, string> = {
  "admin.user.update": "Modification d'un compte",
  "admin.job.retry": "Relance d'un job",
  "admin.budget.update": "Modification du budget IA",
  "admin.alert.ack": "Alerte marquée vue",
  "admin.alert.resolve": "Alerte close",
};

export default async function HealthPage() {
  await requireAdminPage();
  const [overview, jobs, audit] = await Promise.all([getOverview(), getJobsHealth(), listAudit(50)]);

  const stalled = jobs.oldestPendingAgeS > STALLED_QUEUE_S;
  const lastCompleted = jobs.lastCompletedAt ? new Date(jobs.lastCompletedAt) : null;

  return (
    <>
      <PageHeader
        title="Santé & audit"
        description="État du worker, de la file et journal complet des actions de pilotage."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Worker"
          value={stalled ? "À l'arrêt ?" : "Actif"}
          status={stalled ? "critical" : "good"}
          statusLabel={
            stalled
              ? `Plus vieux job en attente : ${formatDuration(jobs.oldestPendingAgeS)}`
              : "File traitée dans les temps"
          }
        />
        <StatTile
          label="Dernier job terminé"
          value={lastCompleted ? lastCompleted.toLocaleTimeString("fr-FR") : "—"}
          hint={lastCompleted ? lastCompleted.toLocaleDateString("fr-FR") : "aucun job terminé"}
        />
        <StatTile
          label="Coupe-circuit IA"
          value={overview.ai.circuitOpen ? "Ouvert" : "Fermé"}
          status={overview.ai.circuitOpen ? "critical" : "good"}
          statusLabel={overview.ai.circuitOpen ? "Générations suspendues" : "Générations autorisées"}
        />
        <StatTile
          label="Alertes ouvertes"
          value={formatInt(overview.alerts.open)}
          status={overview.alerts.critical > 0 ? "critical" : overview.alerts.open > 0 ? "warning" : "good"}
          statusLabel={
            overview.alerts.critical > 0
              ? `${formatInt(overview.alerts.critical)} critique(s)`
              : overview.alerts.open > 0
                ? `${formatInt(overview.alerts.unacked)} non vue(s)`
                : "Rien à signaler"
          }
        />
      </div>

      <section className="mt-6">
        <SectionTitle hint="50 dernières actions">Journal d&apos;audit</SectionTitle>
        <DataTable>
          <TableHead>
            <TableRow>
              <TableTh>Action</TableTh>
              <TableTh>Opérateur</TableTh>
              <TableTh>Cible</TableTh>
              <TableTh>Détail</TableTh>
              <TableTh>Date</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {audit.length === 0 && <TableEmpty colSpan={5}>Aucune action enregistrée.</TableEmpty>}
            {audit.map((a) => (
              <TableRow key={a.id}>
                <TableTd className="font-medium">{ACTION_LABEL[a.action] ?? a.action}</TableTd>
                <TableTd className="font-mono text-xs text-muted-foreground">{a.actorRole ?? "—"}</TableTd>
                <TableTd className="font-mono text-xs text-muted-foreground">{a.targetType ?? "—"}</TableTd>
                <TableTd className="max-w-sm">
                  <span className="line-clamp-2 font-mono text-[11px] text-muted-foreground">
                    {JSON.stringify(a.meta ?? {})}
                  </span>
                </TableTd>
                <TableTd className="font-mono text-xs text-muted-foreground">
                  {new Date(a.createdAt).toLocaleString("fr-FR")}
                </TableTd>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
      </section>
    </>
  );
}
