import Link from "next/link";
import { requireAdminPage } from "@/server/modules/admin/guard";
import { listUsers } from "@/server/modules/admin/service";
import { ListUsersQuery } from "@/server/modules/admin/dto";
import { PageHeader } from "@/components/admin/ui/page-header";
import { UserFilters } from "@/components/admin/user-filters";
import { DataTable, TableBody, TableEmpty, TableHead, TableNum, TableRow, TableTd, TableTh } from "@/components/admin/ui/data-table";
import { formatInt } from "@/components/admin/charts/geometry";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  student: "Étudiant",
  content_admin: "Admin contenu",
  admin: "Administrateur",
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const sp = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  // Une URL trafiquée ne doit pas casser la page : on retombe sur les défauts.
  const parsed = ListUsersQuery.safeParse({
    search: first(sp.search) || undefined,
    role: first(sp.role) || undefined,
    limit: first(sp.limit) || undefined,
    offset: first(sp.offset) || undefined,
  });
  const query = parsed.success ? parsed.data : ListUsersQuery.parse({});
  const page = await listUsers(query);

  const pageCount = Math.max(1, Math.ceil(page.total / page.limit));
  const currentPage = Math.floor(page.offset / page.limit) + 1;

  return (
    <>
      <PageHeader
        title="Utilisateurs"
        description="Annuaire complet : progression, abonnement, rôle et accès. Toute modification est journalisée."
      />

      <UserFilters search={query.search ?? ""} role={query.role ?? ""} />

      <p className="mb-3 font-mono text-xs text-muted-foreground">
        {formatInt(page.total)} compte(s) · page {currentPage} / {pageCount}
      </p>

      <DataTable>
        <TableHead>
          <TableRow>
            <TableTh>Compte</TableTh>
            <TableTh>Rôle</TableTh>
            <TableTh className="text-right">XP</TableTh>
            <TableTh className="text-right">Rang</TableTh>
            <TableTh className="text-right">Série</TableTh>
            <TableTh className="text-right">Maîtrisés</TableTh>
            <TableTh>Abonnement</TableTh>
            <TableTh>État</TableTh>
          </TableRow>
        </TableHead>
        <TableBody>
          {page.items.length === 0 && <TableEmpty colSpan={8}>Aucun compte ne correspond à ces critères.</TableEmpty>}
          {page.items.map((u) => (
            <TableRow key={u.id}>
              <TableTd>
                <Link
                  href={`/cockpit/utilisateurs/${u.id}`}
                  className="font-medium text-primary underline-offset-4 transition-colors hover:text-interaction hover:underline"
                >
                  {u.displayName || u.email || "Compte sans nom"}
                </Link>
                {u.displayName && u.email && (
                  <p className="font-mono text-[11px] text-muted-foreground">{u.email}</p>
                )}
              </TableTd>
              <TableTd>
                <Badge variant={u.role === "admin" ? "default" : u.role === "content_admin" ? "secondary" : "outline"}>
                  {ROLE_LABEL[u.role] ?? u.role}
                </Badge>
              </TableTd>
              <TableNum>{formatInt(u.xpTotal)}</TableNum>
              <TableNum>{u.rankLevel}</TableNum>
              <TableNum>{formatInt(u.streakDays)} j</TableNum>
              <TableNum>{formatInt(u.masteredCount)}</TableNum>
              <TableTd className="text-muted-foreground">{u.subStatus ?? "—"}</TableTd>
              <TableTd>
                {u.suspendedAt ? (
                  <span className="text-xs font-semibold text-destructive">Suspendu</span>
                ) : (
                  <span className="text-xs text-action">Actif</span>
                )}
              </TableTd>
            </TableRow>
          ))}
        </TableBody>
      </DataTable>

      <Pagination query={query} total={page.total} />
    </>
  );
}

function Pagination({ query, total }: { query: ListUsersQuery; total: number }) {
  const build = (offset: number) => {
    const params = new URLSearchParams();
    if (query.search) params.set("search", query.search);
    if (query.role) params.set("role", query.role);
    params.set("limit", String(query.limit));
    params.set("offset", String(offset));
    return `/cockpit/utilisateurs?${params}`;
  };

  const prev = Math.max(0, query.offset - query.limit);
  const next = query.offset + query.limit;
  const hasPrev = query.offset > 0;
  const hasNext = next < total;

  if (!hasPrev && !hasNext) return null;

  return (
    <nav className="mt-4 flex items-center justify-end gap-2" aria-label="Pagination">
      <PageLink href={build(prev)} disabled={!hasPrev}>
        Précédent
      </PageLink>
      <PageLink href={build(next)} disabled={!hasNext}>
        Suivant
      </PageLink>
    </nav>
  );
}

function PageLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  if (disabled) {
    return (
      <span aria-disabled className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground/50">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
    >
      {children}
    </Link>
  );
}
