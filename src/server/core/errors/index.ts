/**
 * Taxonomie d'erreurs applicatives. Les services **retournent/lancent** des `AppError`
 * avec un `code` stable ; un seul point de mapping vers HTTP (à la frontière route).
 */
export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "CONFIG"
  | "DEPENDENCY_UNAVAILABLE"
  | "AI_BUDGET_EXCEEDED"
  | "INTERNAL";

const HTTP_STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 422,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  CONFIG: 503,
  DEPENDENCY_UNAVAILABLE: 503,
  AI_BUDGET_EXCEEDED: 402,
  INTERNAL: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, options?: { details?: unknown; cause?: unknown }) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "AppError";
    this.code = code;
    this.details = options?.details;
  }

  get status(): number {
    return HTTP_STATUS[this.code];
  }

  static unauthenticated(message = "Authentification requise") {
    return new AppError("UNAUTHENTICATED", message);
  }
  static forbidden(message = "Accès refusé") {
    return new AppError("FORBIDDEN", message);
  }
  static notFound(message = "Ressource introuvable") {
    return new AppError("NOT_FOUND", message);
  }
  static validation(message = "Données invalides", details?: unknown) {
    return new AppError("VALIDATION", message, { details });
  }
  static conflict(message = "Conflit") {
    return new AppError("CONFLICT", message);
  }
  static rateLimited(message = "Trop de requêtes") {
    return new AppError("RATE_LIMITED", message);
  }
  static config(message = "Service non configuré") {
    return new AppError("CONFIG", message);
  }
  static dependency(message = "Dépendance indisponible", cause?: unknown) {
    return new AppError("DEPENDENCY_UNAVAILABLE", message, { cause });
  }
  static internal(message = "Erreur interne", cause?: unknown) {
    return new AppError("INTERNAL", message, { cause });
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

/** Mappe n'importe quelle erreur vers le corps + statut HTTP standardisés. */
export function toErrorResponse(err: unknown): {
  status: number;
  body: { error: { code: ErrorCode; message: string; details?: unknown } };
} {
  if (isAppError(err)) {
    return {
      status: err.status,
      body: { error: { code: err.code, message: err.message, details: err.details } },
    };
  }
  return { status: 500, body: { error: { code: "INTERNAL", message: "Erreur interne" } } };
}
