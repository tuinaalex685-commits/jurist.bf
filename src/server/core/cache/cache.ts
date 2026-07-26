import "server-only";
import { randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";
import { env, isConfigured } from "../config/env";
import { logger } from "../logging/logger";

/** Jeton de propriété d'un verrou : seul son détenteur peut le relâcher. */
export interface LockHandle {
  key: string;
  token: string;
}

/** Abstraction de cache : permet de swapper Upstash sans toucher au métier. */
export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(...keys: string[]): Promise<void>;

  /**
   * Acquiert un verrou distribué. Renvoie un jeton de propriété, ou `null` si
   * le verrou est déjà détenu.
   */
  acquireLock(key: string, ttlSeconds: number): Promise<LockHandle | null>;

  /**
   * Relâche un verrou UNIQUEMENT s'il nous appartient encore.
   *
   * Indispensable : si notre verrou a expiré pendant le traitement, un autre
   * worker a pu l'acquérir. Un `DEL` aveugle effacerait SON verrou et
   * autoriserait une troisième exécution concurrente — donc, ici, une
   * génération IA payée deux fois.
   *
   * Renvoie `true` si le verrou nous appartenait et a été relâché.
   */
  releaseLock(lock: LockHandle): Promise<boolean>;
}

/**
 * Fallback quand Redis n'est pas configuré : cache no-op et verrou FICTIF.
 *
 * Acceptable en développement mono-instance. En production, plusieurs instances
 * s'exécutent en parallèle : sans Redis, aucune exclusion mutuelle n'existe
 * réellement. Le moniteur de santé lève une alerte dans ce cas (voir
 * `evaluateSystemHealth`) — on ne se contente pas de le documenter.
 */
class NoopCache implements Cache {
  async get<T>(): Promise<T | null> {
    return null;
  }
  async set(): Promise<void> {}
  async del(): Promise<void> {}

  async acquireLock(key: string): Promise<LockHandle> {
    if (env.NODE_ENV === "production") {
      logger.error("lock_without_redis", {
        key,
        message: "Verrou fictif : Upstash n'est pas configuré, aucune exclusion mutuelle réelle.",
      });
    }
    return { key, token: "noop" };
  }
  async releaseLock(): Promise<boolean> {
    return true;
  }
}

/** Compare-and-delete atomique : la vérification et la suppression ne peuvent pas être entrelacées. */
const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end`;

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

  async acquireLock(key: string, ttlSeconds: number): Promise<LockHandle | null> {
    const token = randomUUID();
    const res = await this.redis.set(key, token, { nx: true, ex: ttlSeconds });
    return res === "OK" ? { key, token } : null;
  }

  async releaseLock(lock: LockHandle): Promise<boolean> {
    const freed = await this.redis.eval(RELEASE_SCRIPT, [lock.key], [lock.token]);
    if (freed !== 1) {
      // Le verrou avait expiré et appartenait peut-être déjà à quelqu'un d'autre :
      // le traitement a duré plus longtemps que le TTL. À surveiller.
      logger.warn("lock_expired_before_release", { key: lock.key });
    }
    return freed === 1;
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

/** Backend réellement actif — affiché dans le cockpit (Santé). */
export function cacheBackend(): "upstash" | "noop" {
  return isConfigured.redis() ? "upstash" : "noop";
}
