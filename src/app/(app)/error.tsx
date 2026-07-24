"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

/** Frontière d'erreur du groupe applicatif. Message clair + réessai. */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // La journalisation serveur est déjà assurée par le backend ; ici on reste discret.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center">
      <div className="hall w-full p-8 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </span>
        <h2 className="font-display text-xl font-semibold">Une erreur est survenue</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Impossible de charger cette page pour le moment. Réessayez dans un instant.
        </p>
        <button
          onClick={reset}
          className="mx-auto mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-action px-5 text-sm font-semibold text-action-foreground shadow-lg shadow-action/20 transition-transform hover:scale-[1.02]"
        >
          <RotateCcw className="h-4 w-4" /> Réessayer
        </button>
      </div>
    </div>
  );
}
