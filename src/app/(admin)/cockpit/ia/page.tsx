import { requireContentAdminPage } from "@/server/modules/admin/guard";
import { getAiUsageDetail, getBudget, getTimeseries } from "@/server/modules/admin/service";
import { listBatches } from "@/server/modules/ai/service";
import { PageHeader, SectionTitle } from "@/components/admin/ui/page-header";
import { StatTile } from "@/components/admin/ui/stat-tile";
import { Meter } from "@/components/admin/ui/meter";
import { BudgetControls } from "@/components/admin/budget-controls";
import { BarChart } from "@/components/admin/charts/bar-chart";
import { DataTable, TableBody, TableEmpty, TableHead, TableNum, TableRow, TableTd, TableTh } from "@/components/admin/ui/data-table";
import { formatInt, formatPercent, formatUsd } from "@/components/admin/charts/geometry";

export const dynamic = "force-dynamic";

const BATCH_LABEL: Record<string, string> = { running: "En cours", done: "Terminé", failed: "Échoué" };

export default async function AiCockpitPage() {
  // Page ouverte aux `content_admin` : c'est leur atelier. Seul le PILOTAGE du
  // budget reste réservé à `admin` (la route PATCH l'exige aussi).
  const user = await requireContentAdminPage();
  const canPilotBudget = user.role === "admin";

  const [ai, budget, series, batches] = await Promise.all([
    getAiUsageDetail(),
    getBudget(),
    getTimeseries(30),
    listBatches(),
  ]);

  const monthRatio = ai.monthlyLimitUsd > 0 ? ai.monthCostUsd / ai.monthlyLimitUsd : 0;
  // Le cache est le levier de rentabilité : chaque hit est une génération non payée.
  const savedGenerations = Math.round(ai.totalGenerations * ai.cacheHitRate);

  return (
    <>
      <PageHeader
        title="Génération IA"
        description="Coûts, plafonds et lots de génération. Le cache partagé fait qu'un contenu n'est jamais payé deux fois."
      />

      {ai.circuitOpen && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <strong className="font-semibold text-destructive">Coupe-circuit actif.</strong>{" "}
          <span className="text-foreground">Toute génération est refusée avant appel au modèle.</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Coût aujourd'hui" value={formatUsd(ai.todayCostUsd)} hint={`plafond ${formatUsd(ai.dailyLimitUsd)}`} />
        <StatTile
          label="Coût ce mois"
          value={formatUsd(ai.monthCostUsd)}
          status={ai.circuitOpen ? "critical" : monthRatio >= 0.8 ? "warning" : "good"}
          statusLabel={ai.circuitOpen ? "Suspendu" : monthRatio >= 0.8 ? "Proche du plafond" : "Sous contrôle"}
          hint={`plafond ${formatUsd(ai.monthlyLimitUsd)}`}
        />
        <StatTile
          label="Taux de cache"
          value={formatPercent(ai.cacheHitRate, 1)}
          hint={`≈ ${formatInt(savedGenerations)} génération(s) économisée(s)`}
        />
        <StatTile
          label="Générations en cache"
          value={formatInt(ai.totalGenerations)}
          hint={`${formatInt(ai.totalTokensIn + ai.totalTokensOut)} jetons cumulés`}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="hall p-5 lg:col-span-2">
          <SectionTitle hint="30 derniers jours">Coût quotidien</SectionTitle>
          <BarChart
            points={series.map((p) => ({ day: p.day, value: p.aiCostUsd }))}
            label="Coût IA quotidien"
            tone="indigo"
            format={formatUsd}
          />
        </section>

        <section className="hall p-5">
          <SectionTitle>Consommation</SectionTitle>
          <div className="space-y-5">
            <Meter label="Aujourd'hui" value={ai.todayCostUsd} max={ai.dailyLimitUsd} format={formatUsd} />
            <Meter label="Ce mois" value={ai.monthCostUsd} max={ai.monthlyLimitUsd} format={formatUsd} />
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {canPilotBudget && (
          <section className="hall p-5">
            <SectionTitle hint={budget.updatedAt ? `maj ${new Date(budget.updatedAt).toLocaleDateString("fr-FR")}` : undefined}>
              Pilotage du budget
            </SectionTitle>
            <BudgetControls budget={budget} />
          </section>
        )}

        <section className={canPilotBudget ? "lg:col-span-2" : "lg:col-span-3"}>
          <SectionTitle hint="20 derniers">Lots de génération</SectionTitle>
          <DataTable>
            <TableHead>
              <TableRow>
                <TableTh>Portée</TableTh>
                <TableTh>État</TableTh>
                <TableTh className="text-right">Fait</TableTh>
                <TableTh className="text-right">Échoué</TableTh>
                <TableTh className="text-right">Total</TableTh>
                <TableTh>Lancé le</TableTh>
              </TableRow>
            </TableHead>
            <TableBody>
              {batches.length === 0 && <TableEmpty colSpan={6}>Aucun lot lancé pour l&apos;instant.</TableEmpty>}
              {batches.map((b) => (
                <TableRow key={b.id}>
                  <TableTd className="font-mono text-xs text-muted-foreground">
                    {(b.scope as { kind?: string })?.kind ?? "—"}
                  </TableTd>
                  <TableTd>
                    <span
                      className={
                        b.status === "failed"
                          ? "text-xs font-semibold text-destructive"
                          : b.status === "done"
                            ? "text-xs text-action"
                            : "text-xs text-warning"
                      }
                    >
                      {BATCH_LABEL[b.status] ?? b.status}
                    </span>
                  </TableTd>
                  <TableNum>{formatInt(b.done)}</TableNum>
                  <TableNum className={b.failed > 0 ? "text-destructive" : undefined}>{formatInt(b.failed)}</TableNum>
                  <TableNum>{formatInt(b.total)}</TableNum>
                  <TableTd className="font-mono text-xs text-muted-foreground">
                    {new Date(b.createdAt).toLocaleString("fr-FR")}
                  </TableTd>
                </TableRow>
              ))}
            </TableBody>
          </DataTable>
        </section>
      </div>
    </>
  );
}
