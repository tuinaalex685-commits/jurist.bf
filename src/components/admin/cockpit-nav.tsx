"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Gauge,
  Users,
  Sparkles,
  FileStack,
  ListChecks,
  BellRing,
  Activity,
  ScrollText,
} from "lucide-react";

/**
 * `adminOnly` reflète le rôle exigé par la route API correspondante : afficher
 * un onglet qui répondrait 403 serait un mensonge d'interface.
 */
const SECTIONS = [
  {
    heading: "Pilotage",
    items: [
      { name: "Vue d'ensemble", href: "/cockpit", icon: Gauge, adminOnly: true },
      { name: "Utilisateurs", href: "/cockpit/utilisateurs", icon: Users, adminOnly: true },
      { name: "Rentabilité", href: "/cockpit/rentabilite", icon: ScrollText, adminOnly: true },
    ],
  },
  {
    heading: "Fabrique de contenu",
    items: [
      { name: "Génération IA", href: "/cockpit/ia", icon: Sparkles, adminOnly: false },
      { name: "Documents sources", href: "/cockpit/documents", icon: FileStack, adminOnly: false },
    ],
  },
  {
    heading: "Système",
    items: [
      { name: "File de traitement", href: "/cockpit/file", icon: ListChecks, adminOnly: false },
      { name: "Alertes", href: "/cockpit/alertes", icon: BellRing, adminOnly: true },
      { name: "Santé & audit", href: "/cockpit/sante", icon: Activity, adminOnly: true },
    ],
  },
] as const;

export function CockpitNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-6 px-3 py-2" aria-label="Sections du cockpit">
      {SECTIONS.map((section) => {
        const items = section.items.filter((item) => isAdmin || !item.adminOnly);
        if (items.length === 0) return null;

        return (
          <div key={section.heading}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
              {section.heading}
            </p>
            <ul className="space-y-1">
              {items.map((item) => {
                const isActive =
                  item.href === "/cockpit" ? pathname === "/cockpit" : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                      )}
                      <item.icon
                        className={cn(
                          "h-[18px] w-[18px] transition-colors",
                          isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                        )}
                      />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
