import "server-only";
import { getCache } from "@/server/core/cache/cache";
import { cacheKeys } from "@/server/core/cache/keys";
import * as repo from "./repository";
import type { CodeSummary, CodeTree } from "@/server/contracts/catalog";

/**
 * Service Catalog. Le contenu publié est identique pour tous les utilisateurs
 * → cache **partagé** (clé non liée à l'utilisateur), TTL court. Invalidation
 * événementielle à la (re)publication (module admin, plus tard).
 */
const CODES_KEY = "jbf:catalog:codes";
const TTL = 300;

export async function getCodes(): Promise<CodeSummary[]> {
  const cache = getCache();
  const cached = await cache.get<CodeSummary[]>(CODES_KEY);
  if (cached) return cached;
  const data = await repo.listCodes();
  await cache.set(CODES_KEY, data, TTL);
  return data;
}

export async function getCodeTree(codeId: string): Promise<CodeTree> {
  const cache = getCache();
  const key = cacheKeys.catalogTree(codeId);
  const cached = await cache.get<CodeTree>(key);
  if (cached) return cached;
  const data = await repo.getCodeTree(codeId);
  await cache.set(key, data, TTL);
  return data;
}

export const getArticle = repo.getArticle;
export const searchArticles = repo.searchArticles;
