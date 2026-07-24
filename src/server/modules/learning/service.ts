import "server-only";
import { getCache } from "@/server/core/cache/cache";
import * as repo from "./repository";
import type { Parcours } from "@/server/contracts/learning";

/**
 * Service Learning. Le parcours publié est identique pour tous les étudiants
 * → cache partagé par article (invalidation événementielle à la republication).
 */
const TTL = 300;
const parcoursKey = (articleId: string) => `jbf:parcours:article:${articleId}`;

export async function getParcours(articleId: string): Promise<Parcours> {
  const cache = getCache();
  const key = parcoursKey(articleId);
  const cached = await cache.get<Parcours>(key);
  if (cached) return cached;

  const data = await repo.getParcours(articleId);
  await cache.set(key, data, TTL);
  return data;
}
