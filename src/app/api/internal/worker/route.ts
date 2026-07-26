import { env } from "@/server/core/config/env";
import { logger } from "@/server/core/logging/logger";
import * as aiRepo from "@/server/modules/ai/repository";
import { handleAiGenerate } from "@/server/workers/handlers/aiGenerate";

export const dynamic = "force-dynamic";

/**
 * POST /api/internal/worker — traite un lot de jobs en attente. Déclenché par
 * un cron externe (Vercel Cron) toutes les minutes. Protégé par un secret
 * partagé, jamais par une session utilisateur (ce n'est pas une route publique).
 */
export async function POST(req: Request) {
  if (env.WORKER_SECRET) {
    const provided = req.headers.get("x-worker-secret");
    if (provided !== env.WORKER_SECRET) {
      return Response.json({ error: { code: "FORBIDDEN", message: "Secret invalide" } }, { status: 403 });
    }
  } else if (env.NODE_ENV === "production") {
    // Fail closed en prod : jamais de traitement de jobs (coûts IA) sans secret configuré.
    logger.error("worker_secret_missing_in_production");
    return Response.json({ error: { code: "CONFIG", message: "WORKER_SECRET manquant" } }, { status: 500 });
  } else {
    logger.warn("worker_no_secret_configured");
  }

  const jobs = await aiRepo.claimJobs(["ai.generate"], 5);
  const results: { id: string; status: "done" | "error" }[] = [];

  for (const job of jobs) {
    const log = logger.child({ jobId: job.id, type: job.type });
    try {
      let result: unknown;
      if (job.type === "ai.generate") {
        result = await handleAiGenerate(job.payload as { articleId: string; requestedBy?: string; batchId?: string });
      } else {
        throw new Error(`Type de job non géré par ce worker : ${job.type}`);
      }
      await aiRepo.completeJob(job.id, result as never);
      results.push({ id: job.id, status: "done" });
      log.info("job_completed");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await aiRepo.failJob(job.id, message);
      results.push({ id: job.id, status: "error" });
      log.error("job_failed", { error: message });
    }
  }

  return Response.json({ data: { claimed: jobs.length, results } });
}
