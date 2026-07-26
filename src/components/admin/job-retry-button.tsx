"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { apiPost } from "@/lib/api-client";

/** Relance d'un job échoué. Seuls `error`/`dead` sont rejouables — le serveur tranche. */
export function JobRetryButton({ jobId, disabled }: { jobId: string; disabled: boolean }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const retry = async () => {
    setPending(true);
    setError(null);
    try {
      await apiPost(`/api/v1/admin/jobs/${jobId}/retry`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de la relance");
    } finally {
      setPending(false);
    }
  };

  if (disabled) return <span className="text-xs text-muted-foreground/50">—</span>;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={retry}
        disabled={pending}
        aria-busy={pending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
        Relancer
      </button>
      {error && (
        <span role="alert" className="text-[11px] text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}
