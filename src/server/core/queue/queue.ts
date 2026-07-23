import "server-only";
import { getSupabaseAdmin } from "../db/admin";
import { isConfigured } from "../config/env";
import { logger } from "../logging/logger";
import { QUEUE_NAME, type Job, type JobType } from "./jobs";

/** Abstraction de file : permet de migrer pgmq → QStash/SQS sans toucher au métier. */
export interface Queue {
  enqueue<T extends JobType>(job: Job<T>): Promise<void>;
}

/**
 * Implémentation pgmq (file Postgres transactionnelle), via une fonction SQL wrapper
 * `public.enqueue_job(...)` (créée en migration B1) appelée en RPC.
 */
class PgmqQueue implements Queue {
  async enqueue<T extends JobType>(job: Job<T>): Promise<void> {
    const admin = getSupabaseAdmin();
    const { error } = await admin.rpc("enqueue_job", {
      p_queue: QUEUE_NAME,
      p_type: job.type,
      p_payload: job.payload,
      p_idempotency_key: job.idempotencyKey ?? null,
      p_run_after: job.runAfter ?? null,
    });
    if (error) throw error;
  }
}

/** Fallback dev (pas de Supabase admin) : journalise au lieu d'enfiler. */
class NoopQueue implements Queue {
  async enqueue<T extends JobType>(job: Job<T>): Promise<void> {
    logger.warn("queue_noop_enqueue", { type: job.type, idempotencyKey: job.idempotencyKey });
  }
}

let cached: Queue | null = null;

export function getQueue(): Queue {
  cached ??= isConfigured.supabaseAdmin() ? new PgmqQueue() : new NoopQueue();
  return cached;
}
