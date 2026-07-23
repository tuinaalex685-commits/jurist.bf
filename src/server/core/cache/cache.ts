import "server-only";
import { Redis } from "@upstash/redis";
import { env, isConfigured } from "../config/env";

/** Abstraction de cache : permet de swapper Upstash sans toucher au métier. */
export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(...keys: string[]): Promise<void>;
}

/** Fallback quand Redis n'est pas configuré : no-op (dégradation gracieuse). */
class NoopCache implements Cache {
  async get<T>(): Promise<T | null> {
    return null;
  }
  async set(): Promise<void> {}
  async del(): Promise<void> {}
}

class UpstashCache implements Cache {
  constructor(private readonly redis: Redis) {}
  async get<T>(key: string): Promise<T | null> {
    return (await this.redis.get<T>(key)) ?? null;
  }
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) await this.redis.set(key, value, { ex: ttlSeconds });
    else await this.redis.set(key, value);
  }
  async del(...keys: string[]): Promise<void> {
    if (keys.length) await this.redis.del(...keys);
  }
}

let cached: Cache | null = null;

export function getCache(): Cache {
  if (cached) return cached;
  if (isConfigured.redis()) {
    const redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL!,
      token: env.UPSTASH_REDIS_REST_TOKEN!,
    });
    cached = new UpstashCache(redis);
  } else {
    cached = new NoopCache();
  }
  return cached;
}
