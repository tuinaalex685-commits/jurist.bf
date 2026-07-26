import { withRoute } from "@/server/core/http/withRoute";
import { requireRole } from "@/server/modules/auth/session";
import { retryJob } from "@/server/modules/admin/service";
import { getRateLimiter } from "@/server/core/ratelimit";
import { AppError } from "@/server/core/errors";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/admin/jobs/:jobId/retry — remet en file un job `error`/`dead`.
 * Limité en débit : relancer en masse des jobs `ai.generate` consomme du budget.
 */
export const POST = withRoute<{ params: Promise<{ jobId: string }> }>(async (_req, _ctx, { params }) => {
  const actor = await requireRole("content_admin");
  const rl = await getRateLimiter("admin-job-retry", 30, 60).limit(actor.id);
  if (!rl.success) throw AppError.rateLimited("Trop de relances, réessayez dans un instant");

  const { jobId } = await params;
  await retryJob(jobId, actor);
  return { data: { retried: true, jobId } };
});
