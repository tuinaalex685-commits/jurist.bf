import { requireAdminPage } from "@/server/modules/admin/guard";
import { getOverview, getTimeseries } from "@/server/modules/admin/service";
import { PageHeader, SectionTitle } from "@/components/admin/ui/page-header";
import { StatTile } from "@/components/admin/ui/stat-tile";
import { TrendChart } from "@/components/admin/charts/trend-chart";
import { BarChart } from "@/components/admin/charts/bar-chart";
import { formatInt, formatMoneyCents, formatUsd } from "@/components/admin/charts/geometry";

export const dynamic = "force-dynamic";

export default async function ProfitabilityPage() {
  await requireAdminPage();
  const [overview, series] = await Promise.all([getOverview(), getTimeseries(30)]);
  const { revenue, users, ai } = overview;

  // Coût IA rapporté à l'audience réellement servie : le vrai indicateur de
  // soutenabilité du modèle (le contenu généré est mutualisé entre étudiants).
  const costPerActiveUser = users.active30d > 0 ? ai.monthCostUsd / users.active30d : 0;
  const cost30d = series.reduce((sum, p) => sum + p.aiCostUsd, 0);

  return (
    <>
      <PageHeader
        title="Rentabilité"
        description="Ce qui entre, ce qui sort. Le coût IA est mutualisé : une génération sert tous les étudiants d'un même article."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Encaissé (30 j)"
          value={formatMoneyCents(revenue.paid30dCents, revenue.currency)}
          hint={`${formatMoneyCents(revenue.paidTotalCents, revenue.currency)} depuis l'origine`}
        />
        <StatTile
          label="Coût IA (30 j)"
          value={formatUsd(cost30d)}
          hint={`${formatUsd(ai.totalCostUsd)} depuis l'origine`}
        />
        <StatTile
          label="Coût IA / actif"
          value={formatUsd(costPerActiveUser)}
          hint={`${formatInt(users.active30d)} actif(s) sur 30 j`}
        />
        <StatTile
          label="Abonnements actifs"
          value={formatInt(revenue.activeSubs)}
          status={revenue.pastDueSubs > 0 ? "warning" : "neutral"}
          statusLabel={revenue.pastDueSubs > 0 ? `${formatInt(revenue.pastDueSubs)} impayé(s)` : undefined}
          hint={`${formatInt(revenue.trialingSubs)} en essai`}
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <section className="hall p-5">
          <SectionTitle hint="30 derniers jours">Nouveaux inscrits</SectionTitle>
          <BarChart
            points={series.map((p) => ({ day: p.day, value: p.newUsers }))}
            label="Nouveaux inscrits"
            tone="emerald"
            format="int"
          />
        </section>

        <section className="hall p-5">
          <SectionTitle hint="30 derniers jours">Coût IA quotidien</SectionTitle>
          <TrendChart
            points={series.map((p) => ({ day: p.day, value: p.aiCostUsd }))}
            label="Coût IA quotidien"
            tone="indigo"
            format="usd"
          />
        </section>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="hall p-5">
          <SectionTitle>Distribution d&apos;accès</SectionTitle>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Figure label="Codes non utilisés" value={formatInt(revenue.codesUnused)} />
            <Figure label="Codes actifs" value={formatInt(revenue.codesActive)} />
            <Figure label="Abonnements actifs" value={formatInt(revenue.activeSubs)} />
            <Figure label="En essai" value={formatInt(revenue.trialingSubs)} />
            <Figure label="Impayés" value={formatInt(revenue.pastDueSubs)} />
            <Figure label="Comptes suspendus" value={formatInt(users.suspended)} />
          </dl>
        </section>

        <section className="hall p-5">
          <SectionTitle>Effet du cache IA</SectionTitle>
          <p className="text-sm text-muted-foreground">
            {formatInt(ai.totalGenerations)} génération(s) sont en cache partagé. Chaque réutilisation est une dépense
            évitée : le coût marginal d&apos;un étudiant supplémentaire sur un article déjà généré est nul.
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4">
            <Figure label="Jetons entrants" value={formatInt(ai.totalTokensIn)} />
            <Figure label="Jetons sortants" value={formatInt(ai.totalTokensOut)} />
            <Figure label="Plafond mensuel" value={formatUsd(ai.monthlyLimitUsd)} />
            <Figure label="Consommé ce mois" value={formatUsd(ai.monthCostUsd)} />
          </dl>
        </section>
      </div>
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
