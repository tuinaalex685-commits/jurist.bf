import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import type { SessionUser } from "@/server/modules/auth/session";
import { CockpitNav } from "./cockpit-nav";

/**
 * Coque du cockpit (Server Component) : marque, navigation, identité de
 * l'opérateur. Volontairement distincte de `AppLayout` — le cockpit n'affiche
 * ni rang, ni série, ni XP : ce n'est pas un espace d'apprentissage.
 */
export function CockpitShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const isAdmin = user.role === "admin";

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
        <div className="flex h-20 items-center gap-3 px-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-sm shadow-primary/25">
            <ShieldCheck className="h-5 w-5 text-primary-foreground" strokeWidth={1.9} />
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold leading-tight tracking-tight">Cockpit</p>
            <p className="truncate text-[11px] text-muted-foreground">Jurist BF</p>
          </div>
        </div>

        <CockpitNav isAdmin={isAdmin} />

        <div className="space-y-3 p-3">
          <div className="hall rounded-2xl p-3">
            <p className="truncate text-xs font-medium text-foreground">{user.email ?? "Compte sans e-mail"}</p>
            <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {isAdmin ? "Administrateur" : "Admin contenu"}
            </p>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l&apos;Académie
          </Link>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
