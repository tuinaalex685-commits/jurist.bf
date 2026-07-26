import "server-only";
import { generateForArticle } from "@/server/modules/ai/generationService";
import * as aiRepo from "@/server/modules/ai/repository";
import { logger } from "@/server/core/logging/logger";
import type { JobPayloads } from "@/server/core/queue/jobs";

/** Handler du job `ai.generate` — exécuté par le worker, jamais par une requête étudiante. */
export async function handleAiGenerate(payload: JobPayloads["ai.generate"]) {
  const log = logger.child({ job: "ai.generate", articleId: payload.articleId, batchId: payload.batchId });
  try {
    const result = await generateForArticle(payload.articleId);
    log.info("job_success", { cacheHit: result.cacheHit, activities: result.activitiesCount, costUsd: result.costUsd });
    if (payload.batchId) await aiRepo.bumpBatch(payload.batchId, "done").then(() => aiRepo.finalizeBatch(payload.batchId!));
    return result;
  } catch (err) {
    if (payload.batchId) await aiRepo.bumpBatch(payload.batchId, "failed").then(() => aiRepo.finalizeBatch(payload.batchId!));
    throw err;
  }
}
