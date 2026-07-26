"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Library, History, GraduationCap, Flame, ShieldCheck } from "lucide-react";
import { RankInsignia } from "@/components/academy/RankInsignia";
import { MOCK_DASHBOARD } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/server/modules/auth/session";

/**
 * Ne référencer QUE des pages qui existent : un lien mort est pire qu'un lien
 * absent. « Progression » et « Profil » ont été retirés tant que leurs pages
 * ne sont pas construites (elles renvoyaient un 404).
 */
const navigation = [
  { name: "Tableau de bord", href: "/", icon: LayoutDashboard },
  { name: "Bibliothèque", href: "/library", icon: Library },
  { name: "Révisions", href: "/revisions", icon: History },
  { name: "Examens", href: "/synthese", icon: GraduationCap },
];

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const { user } = MOCK_DASHBOARD;
  const rankPct = Math.round((user.xpIntoRank / user.xpForNextRank) * 100);
  const isStaff = role === "admin" || role === "content_admin";

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
      {/* Marque */}
      <Link href="/" className="flex h-20 items-center gap-3 px-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-sm shadow-primary/25">
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v18M7 21h10M5 7h14M5 7l-2.5 6a3 3 0 0 0 5 0L5 7Zm14 0-2.5 6a3 3 0 0 0 5 0L19 7Z" />
          </svg>
        </span>
        <span className="font-display text-xl font-semibold tracking-tight text-foreground">
          Jurist<span className="text-primary"> BF</span>
        </span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
          Les Halls
        </p>
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                  )}
                  <item.icon
                    className={cn("h-[18px] w-[18px] transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")}
                  />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Accès au cockpit — visible seulement pour l'équipe, jamais pour un
            étudiant. La vraie garde reste côté serveur (layout + routes API) :
            masquer un lien n'est pas une sécurité, seulement de la clarté. */}
        {isStaff && (
          <>
            <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
              Administration
            </p>
            <ul>
              <li>
                <Link
                  href="/cockpit"
                  className="group relative flex items-center gap-3 rounded-xl border border-gold/30 bg-gold/5 px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-gold/10"
                >
                  <ShieldCheck className="h-[18px] w-[18px] text-gold" />
                  Cockpit
                </Link>
              </li>
            </ul>
          </>
        )}
      </nav>

      {/* Carte de rang */}
      <div className="p-3">
        <div className="hall rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <RankInsignia level={user.rankLevel} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-semibold">{user.rankName}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Flame className="h-3.5 w-3.5 text-warning" />
                {user.streakDays} jours de série
              </p>
            </div>
          </div>
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
              <span>Vers {user.nextRankName}</span>
              <span className="font-mono">{user.xpForNextRank - user.xpIntoRank} XP</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-action" style={{ width: `${rankPct}%` }} />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
