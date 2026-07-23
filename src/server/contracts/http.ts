/**
 * Contrats de transport partagés (importables par le frontend).
 * Enveloppe stable succès/erreur + pagination par curseur.
 */
export type ApiSuccess<T> = { data: T; meta?: Record<string, unknown> };

export type ApiError = {
  error: { code: string; message: string; details?: unknown };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/** Page paginée par curseur (keyset) — jamais d'OFFSET. */
export type Page<T> = {
  items: T[];
  nextCursor: string | null;
};

/** Result explicite pour la couche métier (évite les throws de contrôle de flux). */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
