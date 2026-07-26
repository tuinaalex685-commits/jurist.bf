import Link from "next/link";
import { Users, Sparkles, ListChecks, BellRing, Coins, ShieldAlert } from "lucide-react";
import { requireAdminPage } from "@/server/modules/admin/guard";
import { getOverview, getTimeseries } from "@/server/modules/admin/service";
import { StatTile } from "@/components/admin/ui/stat-tile";
import { Meter } from "@/components/admin/ui/meter";
import { PageHeader, SectionTitle } from "@/components/admin/ui/page-header";
import { TrendChart } from "@/components/admin/charts/trend-chart";
import { BarChart } from "@/components/admin/charts/bar-chart";
import {
  formatDuration,
  formatInt,
  formatMoneyCents,
  formatPercent,
  formatUsd,
} from "@/components/admin/charts/geometry";

export const dynamic = "force-dynamic";

/** Un worker muet plus longtemps que ça sur une file non vide est anormal. */
const STALLED_QUEUE_S = 15 * 60;

export default async function CockpitOverviewPage() {
  await requireAdminPage();

  // Deux lectures indépendantes → en parallèle, jamais en cascade.
  const [overview, series] = await Promise.all([getOverview(), getTimeseries(30)]);

  const { users, revenue, content, learning, ai, jobs, alerts } = overview;
  const queueStalled = jobs.oldestPendingAgeS > STALLED_QUEUE_S;
  const monthRatio = ai.monthlyLimitUsd > 0 ? ai.monthCostUsd / ai.monthlyLimitUsd : 0;

  return (
    <>
      <PageHeader
        title="Vue d'ensemble"
        description="État réel de l'instance : audience, rentabilité, fabrique de contenu et santé du système."
      />

      {/* Bandeau d'incidents — seulement s'il y a quelque chose à dire. */}
      {(alerts.open > 0 || ai.circuitOpen || queueStalled) && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
          <ShieldAlert className="h-5 w-5 shrink-0 text-destructive" />
          <p className="flex-1 text-sm text-foreground">
            {ai.circuitOpen && <strong className="font-semibold">Coupe-circuit IA actif. </strong>}
            {queueStalled && (
              <strong className="font-semibold">
                File bloquée depuis {formatDuration(jobs.oldestPendingAgeS)}.{" "}
              </strong>
            )}
            {alerts.open > 0 && `${formatInt(alerts.open)} alerte(s) ouverte(s), dont ${formatInt(alerts.critical)} critique(s).`}
          </p>
          <Link
            href="/cockpit/alertes"
            className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground transition-opacity hover:opacity-90"
          >
            Voir les alertes
          </Link>
        </div>
      )}

      {/* Bento : quatre chiffres de tête, un par domaine de pilotage. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Utilisateurs"
          value={formatInt(users.total)}
          hint={`${formatInt(users.active7d)} actifs sur 7 j · +${formatInt(users.new7d)} nouveaux`}
          icon={<Users className="h-4 w-4" />}
        />
        <StatTile
          label="Encaissé (30 j)"
          value={formatMoneyCents(revenue.paid30dCents, revenue.currency)}
          hint={`${formatInt(revenue.activeSubs)} abonnements actifs · ${formatInt(revenue.codesUnused)} codes libres`}
          icon={<Coins className="h-4 w-4" />}
        />
        <StatTile
          label="Coût IA (mois)"
          value={formatUsd(ai.monthCostUsd)}
          status={ai.circuitOpen ? "critical" : monthRatio >= 0.8 ? "warning" : "good"}
          statusLabel={
            ai.circuitOpen
              ? "Coupe-circuit actif"
              : monthRatio >= 0.8
                ? "Proche du plafond"
                : "Sous contrôle"
          }
          hint={`${formatPercent(ai.cacheHitRate)} servi par le cache`}
          icon={<Sparkles className="h-4 w-4" />}
        />
        <StatTile
          label="File de traitement"
          value={formatInt(jobs.pending + jobs.running)}
          status={jobs.dead > 0 || queueStalled ? "critical" : jobs.error > 0 ? "warning" : "good"}
          statusLabel={
            queueStalled
              ? `Bloquée depuis ${formatDuration(jobs.oldestPendingAgeS)}`
              : jobs.dead > 0
                ? `${formatInt(jobs.dead)} job(s) abandonné(s)`
                : jobs.error > 0
                  ? `${formatInt(jobs.error)} en erreur`
                  : "Nominale"
          }
          hint="en attente ou en cours"
          icon={<ListChecks className="h-4 w-4" />}
        />
      </div>

      {/* Séries : une grandeur par graphique — jamais deux axes Y. */}
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <section className="hall p-5">
          <SectionTitle hint="30 derniers jours">Utilisateurs actifs par jour</SectionTitle>
          <TrendChart
            points={series.map((p) => ({ day: p.day, value: p.activeUsers }))}
            label="Utilisateurs actifs"
            tone="emerald"
            format="int"
          />
        </section>

        <section className="hall p-5">
          <SectionTitle hint="30 derniers jours">Coût IA par jour</SectionTitle>
          <BarChart
            points={series.map((p) => ({ day: p.day, value: p.aiCostUsd }))}
            label="Coût IA quotidien"
            tone="indigo"
            format="usd"
          />
        </section>

        <section className="hall p-5">
          <SectionTitle hint="30 derniers jours">Nouveaux inscrits par jour</SectionTitle>
          <BarChart
            points={series.map((p) => ({ day: p.day, value: p.newUsers }))}
            label="Nouveaux inscrits"
            tone="rose"
            format="int"
          />
        </section>

        <section className="hall p-5">
          <SectionTitle hint="30 derniers jours">Sceaux décernés par jour</SectionTitle>
          <TrendChart
            points={series.map((p) => ({ day: p.day, value: p.seals }))}
            label="Sceaux décernés"
            tone="sky"
            format="int"
          />
        </section>
      </div>

      {/* Bloc bas : budget, contenu, apprentissage — tailles différenciées (bento). */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="hall p-5 lg:col-span-1">
          <SectionTitle>Budget IA</SectionTitle>
          <div className="space-y-5">
            <Meter label="Aujourd'hui" value={ai.todayCostUsd} max={ai.dailyLimitUsd} format={formatUsd} />
            <Meter label="Ce mois" value={ai.monthCostUsd} max={ai.monthlyLimitUsd} format={formatUsd} />
          </div>
          <Link
            href="/cockpit/ia"
            className="mt-5 inline-flex text-xs font-semibold text-primary transition-colors hover:text-interaction"
          >
            Piloter le budget →
          </Link>
        </section>

        <section className="hall p-5 lg:col-span-2">
          <SectionTitle hint="états publiés">Fabrique de contenu</SectionTitle>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <Figure label="Codes" value={formatInt(content.codes)} />
            <Figure label="Articles" value={formatInt(content.articles)} />
            <Figure label="Versions publiées" value={formatInt(content.versionsPublished)} />
            <Figure label="Activités publiées" value={formatInt(content.activitiesPublished)} />
            <Figure label="Activités en brouillon" value={formatInt(content.activitiesDraft)} />
            <Figure label="Questions d'examen" value={formatInt(content.examQuestions)} />
            <Figure label="Sceaux décernés" value={formatInt(learning.seals)} />
            <Figure label="Examens passés" value={formatInt(learning.examSessions)} />
            <Figure label="Taux de réussite" value={formatPercent(learning.examPassRate)} />
          </dl>
        </section>
      </div>

      <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
        <BellRing className="h-3.5 w-3.5" />
        {formatInt(learning.srsDueNow)} carte(s) de révision dues à cet instant · {formatInt(ai.totalGenerations)}{" "}
        génération(s) IA en cache partagé
      </p>
    </>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  );
}
