/**
 * Clés de cache centralisées (une seule source de vérité → invalidation fiable).
 * Convention : `jbf:<domaine>:<identifiant>` + suffixe de version si pertinent.
 */
export const cacheKeys = {
  dashboard: (userId: string) => `jbf:dashboard:${userId}`,
  userSummary: (userId: string) => `jbf:user-summary:${userId}`,
  catalogTree: (codeId: string) => `jbf:catalog:code:${codeId}`,
  articleParcours: (articleVersionId: string) => `jbf:parcours:${articleVersionId}`,
  search: (query: string) => `jbf:search:${query.toLowerCase().trim()}`,
  aiGenLock: (inputHash: string) => `jbf:ai:lock:${inputHash}`,
  /** Référentiel des rangs : identique pour TOUS les utilisateurs, quasi immuable. */
  ranks: () => `jbf:ref:ranks`,
} as const;
