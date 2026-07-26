import "server-only";
import { logger } from "../logging/logger";

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  label?: string;
}

/** Backoff exponentiel avec jitter. N'avale jamais l'erreur finale. */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 500;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt >= maxAttempts) break;
      const delay = baseDelayMs * 2 ** (attempt - 1) * (0.8 + Math.random() * 0.4);
      logger.warn("retry_attempt_failed", { label: opts.label, attempt, delay: Math.round(delay), error: String(err) });
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
