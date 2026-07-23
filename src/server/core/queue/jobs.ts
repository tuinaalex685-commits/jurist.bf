/**
 * Registre typé des jobs asynchrones. Le `type` est aussi le nom de handler côté worker.
 * Toute la charge coûteuse (IA, parsing, e-mails, agrégats) passe par ici.
 */
export type JobType =
  | "content.parse"
  | "ai.generate"
  | "notify.send"
  | "analytics.rollup"
  | "stats.recompute"
  | "srs.schedule";

export interface JobPayloads {
  "content.parse": { sourceDocumentId: string };
  "ai.generate": { articleVersionId: string; contentType: string; promptMasterVersion: number };
  "notify.send": { userId: string; type: string; data?: Record<string, unknown> };
  "analytics.rollup": { name: string };
  "stats.recompute": { userId: string };
  "srs.schedule": { userId: string; articleVersionId: string };
}

export interface Job<T extends JobType = JobType> {
  type: T;
  payload: JobPayloads[T];
  /** Clé d'idempotence (un même job n'a d'effet qu'une fois). */
  idempotencyKey?: string;
  /** Report d'exécution (ISO) — pour le backoff / la planification. */
  runAfter?: string;
}

/** Nom de la file pgmq unique (routage par `type` côté worker). */
export const QUEUE_NAME = "jbf_jobs";
