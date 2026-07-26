import { env } from "@/server/core/config/env";
import { logger } from "@/server/core/logging/logger";
import * as aiRepo from "@/server/modules/ai/repository";
import { handleAiGenerate } from "@/server/workers/handlers/aiGenerate";
import { evaluateSystemHealth } from "@/server/modules/admin/monitoring";

export const dynamic = "force-dynamic";
/** Un lot peut enchaîner plusieurs appels modèle : on laisse de la marge. */
export const maxDuration = 60;

/** Nombre de jobs réclamés par passage — borne la durée d'une invocation. */
const BATCH_SIZE = 5;

/**
 * Authentifie un déclenchement du worker. Deux porteurs légitimes :
 *  - Vercel Cron → `Authorization: Bearer <CRON_SECRET>` (ajouté par la plateforme
 *    dès que CRON_SECRET est défini) ;
 *  - un appel manuel/externe → en-tête `x-worker-secret`.
 *
 * FAIL CLOSED en production : sans secret configuré, aucun traitement. Cette
 * route dépense de l'argent (appels modèle) — elle ne doit jamais être ouverte.
 */
function authorize(req: Request): { ok: true } | { ok: false; status: number; code: string; message: string } {
  const bearer = req.headers.get("authorization");
  const workerSecret = req.headers.get("x-worker-secret");

  if (env.CRON_SECRET && bearer === `Bearer ${env.CRON_SECRET}`) return { ok: true };
  if (env.WORKER_SECRET && workerSecret === env.WORKER_SECRET) return { ok: true };

  if (!env.CRON_SECRET && !env.WORKER_SECRET) {
    if (env.NODE_ENV === "production") {
      logger.error("worker_secret_missing_in_production");
      return { ok: false, status: 500, code: "CONFIG", message: "CRON_SECRET/WORKER_SECRET manquant" };
    }
    logger.warn("worker_no_secret_configured");
    return { ok: true };
  }

  return { ok: false, status: 403, code: "FORBIDDEN", message: "Secret invalide" };
}

async function runWorker(req: Request): Promise<Response> {
  const auth = authorize(req);
  if (!auth.ok) {
    return Response.json({ error: { code: auth.code, message: auth.message } }, { status: auth.status });
  }

  const jobs = await aiRepo.claimJobs(["ai.generate"], BATCH_SIZE);
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

  // Le moniteur tourne à CHAQUE passage, y compris quand la file est vide :
  // c'est précisément quand plus rien n'avance qu'il faut lever l'alerte.
  // Son échec ne doit jamais faire échouer le traitement des jobs.
  let health: Awaited<ReturnType<typeof evaluateSystemHealth>> | null = null;
  try {
    health = await evaluateSystemHealth();
  } catch (err) {
    logger.error("health_evaluation_failed", { error: err instanceof Error ? err.message : String(err) });
  }

  return Response.json({ data: { claimed: jobs.length, results, health } });
}

/** Vercel Cron déclenche en GET. */
export const GET = runWorker;
/** Appel manuel / ordonnanceur externe. */
export const POST = runWorker;
