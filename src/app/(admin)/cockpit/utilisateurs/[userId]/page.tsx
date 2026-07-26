import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdminPage } from "@/server/modules/admin/guard";
import { getUserDetail } from "@/server/modules/admin/service";
import { isAppError } from "@/server/core/errors";
import { PageHeader, SectionTitle } from "@/components/admin/ui/page-header";
import { StatTile } from "@/components/admin/ui/stat-tile";
import { UserActions } from "@/components/admin/user-actions";
import { DataTable, TableBody, TableEmpty, TableHead, TableNum, TableRow, TableTd, TableTh } from "@/components/admin/ui/data-table";
import { formatInt, formatPercent } from "@/components/admin/charts/geometry";

export const dynamic = "force-dynamic";

export default async function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const actor = await requireAdminPage();
  const { userId } = await params;

  const user = await getUserDetail(userId).catch((err) => {
    if (isAppError(err) && err.code === "NOT_FOUND") notFound();
    throw err;
  });

  const passRate = user.examSessions > 0 ? user.examPassed / user.examSessions : 0;

  return (
    <>
      <Link
        href="/cockpit/utilisateurs"
        className="mb-4 inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Retour à l&apos;annuaire
      </Link>

      <PageHeader
        title={user.displayName || user.email || "Compte sans nom"}
        description={user.email ?? undefined}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="XP total" value={formatInt(user.stats.xpTotal)} hint={`Rang ${user.stats.rankLevel}`} />
            <StatTile label="Sceaux" value={formatInt(user.seals)} hint={`${formatInt(user.badges)} badge(s)`} />
            <StatTile
              label="Examens"
              value={formatInt(user.examSessions)}
              hint={`${formatPercent(passRate)} de réussite`}
            />
            <StatTile
              label="Révisions dues"
              value={formatInt(user.srsDue)}
              hint={`sur ${formatInt(user.srsTotal)} carte(s)`}
            />
          </div>

          <section>
            <SectionTitle hint="20 derniers mouvements">Journal d&apos;XP</SectionTitle>
            <DataTable>
              <TableHead>
                <TableRow>
                  <TableTh>Motif</TableTh>
                  <TableTh className="text-right">Delta</TableTh>
                  <TableTh>Date</TableTh>
                </TableRow>
              </TableHead>
              <TableBody>
                {user.recentXp.length === 0 && <TableEmpty colSpan={3}>Aucun gain d&apos;XP enregistré.</TableEmpty>}
                {user.recentXp.map((x, i) => (
                  <TableRow key={`${x.created_at}-${i}`}>
                    <TableTd className="text-muted-foreground">{x.reason}</TableTd>
                    <TableNum className={x.delta >= 0 ? "text-action" : "text-destructive"}>
                      {x.delta >= 0 ? "+" : ""}
                      {formatInt(x.delta)}
                    </TableNum>
                    <TableTd className="font-mono text-xs text-muted-foreground">
                      {new Date(x.created_at).toLocaleString("fr-FR")}
                    </TableTd>
                  </TableRow>
                ))}
              </TableBody>
            </DataTable>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="hall p-5">
            <SectionTitle>Accès</SectionTitle>
            <UserActions
              userId={user.id}
              role={user.role}
              suspended={Boolean(user.suspendedAt)}
              isSelf={user.id === actor.id}
            />
          </section>

          <section className="hall p-5">
            <SectionTitle>Compte</SectionTitle>
            <dl className="space-y-2.5 text-sm">
              <Row label="Inscrit le" value={new Date(user.createdAt).toLocaleDateString("fr-FR")} />
              <Row label="Série" value={`${formatInt(user.stats.streakDays)} jour(s)`} />
              <Row label="Articles maîtrisés" value={formatInt(user.stats.masteredCount)} />
              <Row
                label="Dernière activité"
                value={user.stats.lastActiveOn ? new Date(user.stats.lastActiveOn).toLocaleDateString("fr-FR") : "—"}
              />
              <Row
                label="Abonnement"
                value={(user.subscription?.plan as string) ?? "Aucun"}
                hint={(user.subscription?.status as string) ?? undefined}
              />
              <Row label="État" value={user.suspendedAt ? "Suspendu" : "Actif"} />
            </dl>
          </section>
        </aside>
      </div>
    </>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-right font-mono text-xs tabular-nums text-foreground">
        {value}
        {hint && <span className="ml-1 text-muted-foreground">({hint})</span>}
      </dd>
    </div>
  );
}
