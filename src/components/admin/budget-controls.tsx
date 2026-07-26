"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Power } from "lucide-react";
import { apiPatch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { BudgetConfig } from "@/server/contracts/admin";

/**
 * Pilotage du robinet de dépense IA. Le coupe-circuit est l'action la plus
 * lourde de conséquence du cockpit : elle est confirmée, jamais à un clic sec.
 */
export function BudgetControls({ budget }: { budget: BudgetConfig }) {
  const router = useRouter();
  const [daily, setDaily] = React.useState(String(budget.dailyUsd));
  const [monthly, setMonthly] = React.useState(String(budget.monthlyUsd));
  const [pending, setPending] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const mutate = async (patch: Record<string, unknown>, key: string, successMessage: string) => {
    setPending(key);
    setError(null);
    setNotice(null);
    try {
      await apiPatch<BudgetConfig>("/api/v1/admin/budget", patch);
      setNotice(successMessage);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de la mise à jour");
    } finally {
      setPending(null);
    }
  };

  const saveLimits = (e: React.FormEvent) => {
    e.preventDefault();
    const d = Number(daily.replace(",", "."));
    const m = Number(monthly.replace(",", "."));
    if (!Number.isFinite(d) || !Number.isFinite(m) || d < 0 || m < 0) {
      setError("Les plafonds doivent être des montants positifs.");
      return;
    }
    void mutate({ dailyUsd: d, monthlyUsd: m }, "limits", "Plafonds enregistrés.");
  };

  const toggleCircuit = () => {
    const opening = !budget.circuitOpen;
    const confirmed = window.confirm(
      opening
        ? "Ouvrir le coupe-circuit suspend TOUTE génération IA de l'instance. Confirmer ?"
        : "Refermer le coupe-circuit autorise à nouveau les dépenses IA. Confirmer ?",
    );
    if (!confirmed) return;
    void mutate(
      { circuitOpen: opening },
      "circuit",
      opening ? "Générations suspendues." : "Générations réautorisées.",
    );
  };

  return (
    <div className="space-y-5">
      <form onSubmit={saveLimits} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="daily" label="Plafond journalier ($)" value={daily} onChange={setDaily} />
          <Field id="monthly" label="Plafond mensuel ($)" value={monthly} onChange={setMonthly} />
        </div>
        <button
          type="submit"
          disabled={pending !== null}
          aria-busy={pending === "limits"}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-60"
        >
          {pending === "limits" && <Loader2 className="h-4 w-4 animate-spin" />}
          Enregistrer les plafonds
        </button>
      </form>

      <div className="border-t border-border pt-4">
        <p className="mb-2 text-xs text-muted-foreground">
          Le coupe-circuit bloque toute génération <strong>avant</strong> le moindre appel réseau au modèle.
        </p>
        <button
          type="button"
          onClick={toggleCircuit}
          disabled={pending !== null}
          aria-busy={pending === "circuit"}
          className={cn(
            "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-60",
            budget.circuitOpen
              ? "bg-action text-action-foreground"
              : "border border-destructive/40 bg-destructive/10 text-destructive",
          )}
        >
          {pending === "circuit" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
          {budget.circuitOpen ? "Réautoriser les générations" : "Suspendre toute génération"}
        </button>
      </div>

      {notice && (
        <p role="status" className="rounded-lg border border-action/30 bg-action/5 px-3 py-2 text-xs text-action">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-xl border border-input bg-card px-3 font-mono text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
      />
    </div>
  );
}
