"use client";

import { Bell, Search, Flame } from "lucide-react";
import { MOCK_DASHBOARD } from "@/lib/mock-data";

export function Header() {
  const { user } = MOCK_DASHBOARD;

  return (
    <header className="sticky top-0 z-40 flex h-20 items-center gap-4 border-b border-border bg-background/80 px-6 backdrop-blur-xl">
      {/* Recherche ⌘K */}
      <button
        type="button"
        className="group flex h-10 w-full max-w-sm items-center gap-2.5 rounded-xl border border-border bg-muted/60 px-3.5 text-sm text-muted-foreground transition-colors hover:border-interaction/40 hover:bg-muted"
      >
        <Search className="h-4 w-4" />
        <span>Invoquer un article, une notion…</span>
        <kbd className="ml-auto rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full border border-warning/25 bg-warning/10 px-3 py-1.5 text-sm font-semibold text-warning">
          <Flame className="h-4 w-4" />
          {user.streakDays}
        </span>

        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
        </button>

        <button
          type="button"
          className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-muted"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-display text-sm font-semibold text-primary-foreground">
            {user.firstName.charAt(0)}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-semibold leading-tight">{user.honorific} {user.firstName}</span>
            <span className="block text-[11px] leading-tight text-muted-foreground">{user.rankName}</span>
          </span>
        </button>
      </div>
    </header>
  );
}
