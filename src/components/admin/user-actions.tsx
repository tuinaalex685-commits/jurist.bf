"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { apiPatch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface UserActionsProps {
  userId: string;
  role: string;
  suspended: boolean;
  /** Vrai si la cible est l'opérateur : le backend refuse l'auto-modification. */
  isSelf: boolean;
}

/**
 * Actions de pilotage d'un compte. Les garde-fous réels vivent côté serveur
 * (dernier admin, auto-modification) ; l'interface se contente de les refléter
 * et de restituer honnêtement le message d'erreur renvoyé.
 */
export function UserActions({ userId, role, suspended, isSelf }: UserActionsProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const mutate = async (patch: Record<string, unknown>, key: string) => {
    setPending(key);
    setError(null);
    try {
      await apiPatch(`/api/v1/admin/users/${userId}`, patch);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de la modification");
    } finally {
      setPending(null);
    }
  };

  if (isSelf) {
    return (
      <p className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        C&apos;est votre propre compte : le cockpit interdit de modifier son propre rôle ou son propre accès, pour
        qu&apos;une console d&apos;administration ne puisse jamais se verrouiller elle-même.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="role-select" className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Rôle
        </label>
        <select
          id="role-select"
          value={role}
          disabled={pending !== null}
          onChange={(e) => mutate({ role: e.target.value }, "role")}
          className="h-10 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-60"
        >
          <option value="student">Étudiant</option>
          <option value="content_admin">Admin contenu</option>
          <option value="admin">Administrateur</option>
        </select>
      </div>

      <button
        type="button"
        disabled={pending !== null}
        aria-busy={pending === "suspend"}
        onClick={() => mutate({ suspended: !suspended }, "suspend")}
        className={cn(
          "inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-60",
          suspended
            ? "bg-action text-action-foreground"
            : "border border-destructive/40 bg-destructive/10 text-destructive",
        )}
      >
        {pending === "suspend" && <Loader2 className="h-4 w-4 animate-spin" />}
        {suspended ? "Réactiver le compte" : "Suspendre le compte"}
      </button>

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
