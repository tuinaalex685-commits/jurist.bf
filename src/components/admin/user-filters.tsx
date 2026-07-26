"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

/**
 * Filtres d'annuaire. Ils écrivent dans l'URL plutôt que dans un état local :
 * la vue reste partageable, rechargeable, et le serveur refait la requête.
 */
export function UserFilters({ search, role }: { search: string; role: string }) {
  const router = useRouter();
  const [value, setValue] = React.useState(search);

  const submit = (nextSearch: string, nextRole: string) => {
    const params = new URLSearchParams();
    if (nextSearch.trim()) params.set("search", nextSearch.trim());
    if (nextRole) params.set("role", nextRole);
    router.push(`/cockpit/utilisateurs${params.toString() ? `?${params}` : ""}`);
  };

  return (
    <form
      className="mb-4 flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit(value, role);
      }}
    >
      <div className="min-w-[16rem] flex-1">
        <label htmlFor="user-search" className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Rechercher
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="user-search"
            type="search"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Nom ou e-mail"
            className="h-10 w-full rounded-xl border border-input bg-card pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
          />
        </div>
      </div>

      <div>
        <label htmlFor="user-role" className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Rôle
        </label>
        <select
          id="user-role"
          value={role}
          onChange={(e) => submit(value, e.target.value)}
          className="h-10 rounded-xl border border-input bg-card px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
        >
          <option value="">Tous les rôles</option>
          <option value="student">Étudiant</option>
          <option value="content_admin">Admin contenu</option>
          <option value="admin">Administrateur</option>
        </select>
      </div>

      <button
        type="submit"
        className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
      >
        Filtrer
      </button>
    </form>
  );
}
