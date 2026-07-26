import "server-only";
import { getAiProvider } from "@/server/core/ai/provider";
import { getActivePrompt, composePrompt } from "@/server/core/ai/promptService";
import { buildInputHash } from "@/server/core/ai/hash";
import { withRetry } from "@/server/core/ai/retry";
import { assertBudgetAvailable } from "@/server/core/ai/budget";
import { getCache } from "@/server/core/cache/cache";
import { cacheKeys } from "@/server/core/cache/keys";
import { AppError } from "@/server/core/errors";
import { logger } from "@/server/core/logging/logger";
import { parseBundle } from "./bundleSchema";
import * as repo from "./repository";
import type { GenerationResult } from "@/server/contracts/ai";

const CONTENT_TYPE = "bundle";

/**
 * Durée de vie du verrou de génération. Doit rester STRICTEMENT supérieure au
 * temps d'exécution maximal d'un passage de worker (`maxDuration = 60 s` sur
 * /api/internal/worker), sinon le verrou expirerait pendant le travail et
 * autoriserait une seconde génération — donc une facture doublée.
 */
const LOCK_TTL_S = 180;

/**
 * Pipeline complet de génération pour UN article :
 * dédup (input_hash) → budget → verrou → appel provider (retry) → validation
 * du bundle → persistance (ai_generations/ai_usage) → écriture en `draft`.
 *
 * INVARIANT : jamais appelé par un étudiant. Coût marginal par étudiant = 0,
 * puisque le résultat est mis en cache par version d'article et réutilisé.
 */
export async function generateForArticle(articleId: string): Promise<GenerationResult> {
  const target = await repo.getGenerationTarget(articleId);
  const prompt = await getActivePrompt("master");

  const inputHash = buildInputHash({
    promptKey: prompt.key,
    promptVersion: prompt.version,
    textHash: target.textHash,
    contentType: CONTENT_TYPE,
  });

  // 1) Cache partagé : si déjà généré pour cette version+prompt, on réutilise (0 coût, 0 appel).
  const existing = await repo.findGenerationByHash(inputHash);
  if (existing) {
    const bundle = parseBundle(JSON.stringify(existing.output));
    const written = await repo.replaceDraftContent(target.versionId, bundle);
    await repo.recordUsage({ feature: CONTENT_TYPE, codeId: target.codeId, tokensIn: 0, tokensOut: 0, costUsd: 0, cacheHit: true });
    logger.info("ai_generation_cache_hit", { articleId, inputHash });
    return { cacheHit: true, ...written, tokensIn: existing.tokens_in, tokensOut: existing.tokens_out, costUsd: 0 };
  }

  // 2) Budget — coupe-circuit AVANT tout appel réseau.
  await assertBudgetAvailable();

  // 3) Verrou de dédup (évite deux générations concurrentes pour la même clé).
  //    TTL > durée max d'exécution du worker (maxDuration = 60 s) : le verrou
  //    ne peut pas expirer sous les pieds d'une génération encore en cours.
  const cache = getCache();
  const lockKey = cacheKeys.aiGenLock(inputHash);
  const lock = await cache.acquireLock(lockKey, LOCK_TTL_S);
  if (!lock) {
    throw AppError.conflict("Une génération est déjà en cours pour cet article — réessayez dans un instant");
  }

  try {
    const finalPrompt = composePrompt(prompt, {
      article_number: target.number,
      article_title: target.title ?? "",
      official_text: target.officialText,
    });

    const provider = getAiProvider();
    const response = await withRetry(
      () => provider.generate({ prompt: finalPrompt, model: prompt.model, context: { articleNumber: target.number, articleTitle: target.title, officialText: target.officialText } }),
      { maxAttempts: 3, label: "ai.generate" },
    );

    const bundle = parseBundle(response.text);

    const saved = await repo.recordGeneration({
      contentType: CONTENT_TYPE,
      sourceVersionId: target.versionId,
      promptVersion: prompt.version,
      inputHash,
      model: response.model,
      output: bundle,
      tokensIn: response.tokensIn,
      tokensOut: response.tokensOut,
      costUsd: response.costUsd,
    });

    const written = await repo.replaceDraftContent(target.versionId, bundle);
    await repo.recordUsage({ feature: CONTENT_TYPE, codeId: target.codeId, tokensIn: response.tokensIn, tokensOut: response.tokensOut, costUsd: response.costUsd, cacheHit: false });

    logger.info("ai_generation_success", { articleId, inputHash, model: response.model, costUsd: response.costUsd });
    return { cacheHit: false, ...written, tokensIn: saved?.tokens_in ?? response.tokensIn, tokensOut: saved?.tokens_out ?? response.tokensOut, costUsd: response.costUsd };
  } finally {
    // Relâche uniquement si le verrou nous appartient encore : ne jamais
    // effacer celui d'un autre worker (cf. Cache.releaseLock).
    await cache.releaseLock(lock);
  }
}
