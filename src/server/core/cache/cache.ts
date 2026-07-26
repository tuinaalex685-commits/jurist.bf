import "server-only";
import { Redis } from "@upstash/redis";
import { env, isConfigured } from "../config/env";

/** Abstraction de cache : permet de swapper Upstash sans toucher au métier. */
export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(...keys: string[]): Promise<void>;
  /** Verrou distribué léger (SET NX) : true si acquis, false si déjà pris. */
  setIfAbsent(key: string, ttlSeconds: number): Promise<boolean>;
}

/** Fallback quand Redis n'est pas configuré : no-op (dégradation gracieuse).
 *  setIfAbsent renvoie toujours true (mono-instance dev) — documenté : en
 *  production, Upstash doit être configuré pour un vrai verrou de dédup IA. */
class NoopCache implements Cache {
  async get<T>(): Promise<T | null> {
    return null;
  }
  async set(): Promise<void> {}
  async del(): Promise<void> {}
  async setIfAbsent(): Promise<boolean> {
    return true;
  }
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
  async setIfAbsent(key: string, ttlSeconds: number): Promise<boolean> {
    const res = await this.redis.set(key, "1", { nx: true, ex: ttlSeconds });
    return res === "OK";
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
