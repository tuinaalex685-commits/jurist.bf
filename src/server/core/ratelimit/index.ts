import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env, isConfigured } from "../config/env";

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

export interface RateLimiter {
  limit(identifier: string): Promise<RateLimitResult>;
}

class NoopLimiter implements RateLimiter {
  async limit(): Promise<RateLimitResult> {
    return { success: true, remaining: Number.MAX_SAFE_INTEGER, reset: 0 };
  }
}

class UpstashLimiter implements RateLimiter {
  constructor(private readonly rl: Ratelimit) {}
  async limit(identifier: string): Promise<RateLimitResult> {
    const r = await this.rl.limit(identifier);
    return { success: r.success, remaining: r.remaining, reset: r.reset };
  }
}

let redis: Redis | null = null;
const limiters = new Map<string, RateLimiter>();

/**
 * Fabrique un rate limiter à fenêtre glissante par « bucket » (auth, redeem, ai, mutation…).
 * Sans Upstash configuré → NoopLimiter (autorise tout), afin de ne pas bloquer le dev.
 */
export function getRateLimiter(bucket: string, limit: number, windowSeconds: number): RateLimiter {
  const key = `${bucket}:${limit}:${windowSeconds}`;
  const existing = limiters.get(key);
  if (existing) return existing;

  let limiter: RateLimiter;
  if (isConfigured.redis()) {
    redis ??= new Redis({ url: env.UPSTASH_REDIS_REST_URL!, token: env.UPSTASH_REDIS_REST_TOKEN! });
    limiter = new UpstashLimiter(
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
        prefix: `jbf:rl:${bucket}`,
        analytics: false,
      }),
    );
  } else {
    limiter = new NoopLimiter();
  }
  limiters.set(key, limiter);
  return limiter;
}
