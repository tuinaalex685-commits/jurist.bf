import Link from "next/link";
import { requireContentAdminPage } from "@/server/modules/admin/guard";
import { getJobsHealth, listJobs } from "@/server/modules/admin/service";
import { ListJobsQuery } from "@/server/modules/admin/dto";
import { PageHeader } from "@/components/admin/ui/page-header";
import { StatTile } from "@/components/admin/ui/stat-tile";
import { JobRetryButton } from "@/components/admin/job-retry-button";
import { DataTable, TableBody, TableEmpty, TableHead, TableNum, TableRow, TableTd, TableTh } from "@/components/admin/ui/data-table";
import { formatDuration, formatInt } from "@/components/admin/charts/geometry";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STALLED_QUEUE_S = 15 * 60;

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  running: "En cours",
  done: "Terminé",
  error: "En erreur",
  dead: "Abandonné",
};

const STATUS_CLASS: Record<string, string> = {
  pending: "text-muted-foreground",
  running: "text-warning",
  done: "text-action",
  error: "text-destructive",
  dead: "text-destructive font-semibold",
};

const FILTERS = [
  { label: "Tous", status: "" },
  { label: "En attente", status: "pending" },
  { label: "En erreur", status: "error" },
  { label: "Abandonnés", status: "dead" },
  { label: "Terminés", status: "done" },
];

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireContentAdminPage();
  const sp = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const parsed = ListJobsQuery.safeParse({
    type: first(sp.type) || undefined,
    status: first(sp.status) || undefined,
    limit: first(sp.limit) || undefined,
    offset: first(sp.offset) || undefined,
  });
  const query = parsed.success ? parsed.data : ListJobsQuery.parse({});

  const [health, page] = await Promise.all([getJobsHealth(), listJobs(query)]);
  const stalled = health.oldestPendingAgeS > STALLED_QUEUE_S;

  return (
    <>
      <PageHeader
        title="File de traitement"
        description="Jobs asynchrones tous types confondus. Un job échoué est rejouable ; un job en cours ne l'est jamais."
      />

      {stalled && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <strong className="font-semibold text-destructive">
            Le plus vieux job exigible attend depuis {formatDuration(health.oldestPendingAgeS)}.
          </strong>{" "}
          <span className="text-foreground">
            Le worker ne tourne probablement plus — vérifiez le cron et le secret partagé.
          </span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile label="En attente" value={formatInt(health.pending)} />
        <StatTile label="En cours" value={formatInt(health.running)} />
        <StatTile
          label="En erreur"
          value={formatInt(health.error)}
          status={health.error > 0 ? "warning" : "neutral"}
          statusLabel={health.error > 0 ? "Réessais programmés" : undefined}
        />
        <StatTile
          label="Abandonnés"
          value={formatInt(health.dead)}
          status={health.dead > 0 ? "critical" : "neutral"}
          statusLabel={health.dead > 0 ? "Intervention requise" : undefined}
        />
        <StatTile
          label="Attente la plus ancienne"
          value={health.oldestPendingAgeS > 0 ? formatDuration(health.oldestPendingAgeS) : "—"}
          status={stalled ? "critical" : "neutral"}
          statusLabel={stalled ? "Worker à l'arrêt ?" : undefined}
        />
      </div>

      <nav className="mt-6 mb-3 flex flex-wrap gap-2" aria-label="Filtrer par état">
        {FILTERS.map((f) => {
          const isActive = (query.status ?? "") === f.status;
          const href = f.status ? `/cockpit/file?status=${f.status}` : "/cockpit/file";
          return (
            <Link
              key={f.label}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      <DataTable>
        <TableHead>
          <TableRow>
            <TableTh>Type</TableTh>
            <TableTh>État</TableTh>
            <TableTh className="text-right">Tentatives</TableTh>
            <TableTh>Dernière erreur</TableTh>
            <TableTh>Mis à jour</TableTh>
            <TableTh className="text-right">Action</TableTh>
          </TableRow>
        </TableHead>
        <TableBody>
          {page.items.length === 0 && <TableEmpty colSpan={6}>Aucun job dans cet état.</TableEmpty>}
          {page.items.map((j) => (
            <TableRow key={j.id}>
              <TableTd className="font-mono text-xs">{j.type}</TableTd>
              <TableTd>
                <span className={cn("text-xs", STATUS_CLASS[j.status] ?? "text-muted-foreground")}>
                  {STATUS_LABEL[j.status] ?? j.status}
                </span>
              </TableTd>
              <TableNum>
                {formatInt(j.attempts)} / {formatInt(j.maxAttempts)}
              </TableNum>
              <TableTd className="max-w-sm">
                {j.lastError ? (
                  <span className="line-clamp-2 text-xs text-destructive" title={j.lastError}>
                    {j.lastError}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground/50">—</span>
                )}
              </TableTd>
              <TableTd className="font-mono text-xs text-muted-foreground">
                {new Date(j.updatedAt).toLocaleString("fr-FR")}
              </TableTd>
              <TableTd className="text-right">
                <JobRetryButton jobId={j.id} disabled={!["error", "dead"].includes(j.status)} />
              </TableTd>
            </TableRow>
          ))}
        </TableBody>
      </DataTable>

      <p className="mt-3 font-mono text-xs text-muted-foreground">
        {formatInt(page.total)} job(s) · {formatInt(health.done)} terminé(s) au total
      </p>
    </>
  );
}
