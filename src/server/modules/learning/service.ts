import "server-only";
import { getCache } from "@/server/core/cache/cache";
import * as repo from "./repository";
import { evaluate } from "./evaluation";
import type { AttemptResult, Parcours } from "@/server/contracts/learning";

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

/**
 * Soumet une tentative : notation serveur (méthode d'éval) → persistance atomique
 * (tentative + progression de phase) → renvoie le feedback et l'état de la phase.
 * La bonne réponse n'est jamais renvoyée telle quelle ; seul le feedback prévu l'est.
 */
export async function submitAttempt(activityId: string, response: unknown): Promise<AttemptResult> {
  const grading = await repo.getGradingData(activityId);
  const method = typeof grading.evaluation.method === "string" ? grading.evaluation.method : "exact";

  const out = evaluate(method, response, grading.solution, grading.evaluation);

  const feedback =
    (out.passed ? grading.feedback.correct : grading.feedback.incorrect) as string | undefined;

  const phase = await repo.recordAttempt(activityId, response, out.score, out.passed, out.detail);

  return {
    score: out.score,
    passed: out.passed,
    feedback: feedback ?? null,
    detail: out.detail,
    phase: { index: phase.phase, score: phase.phase_score, completed: phase.phase_completed },
  };
}
