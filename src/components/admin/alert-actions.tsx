"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { apiPost } from "@/lib/api-client";

/**
 * Accusé de réception ≠ résolution. « Vu » signale qu'un humain a pris la main ;
 * « Clore » affirme que la cause a disparu — si elle persiste, le moniteur
 * relèvera une alerte au prochain passage.
 */
export function AlertActions({ alertId, acknowledged }: { alertId: string; acknowledged: boolean }) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const act = async (action: "ack" | "resolve") => {
    setPending(action);
    setError(null);
    try {
      await apiPost(`/api/v1/admin/alerts/${alertId}/${action}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action impossible");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {!acknowledged && (
          <button
            type="button"
            onClick={() => act("ack")}
            disabled={pending !== null}
            aria-busy={pending === "ack"}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-60"
          >
            {pending === "ack" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Vu
          </button>
        )}
        <button
          type="button"
          onClick={() => act("resolve")}
          disabled={pending !== null}
          aria-busy={pending === "resolve"}
          className="inline-flex items-center gap-1.5 rounded-lg border border-action/40 bg-action/10 px-2.5 py-1 text-xs font-medium text-action transition-colors hover:bg-action/20 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-60"
        >
          {pending === "resolve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
          Clore
        </button>
      </div>
      {error && (
        <span role="alert" className="text-[11px] text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}
