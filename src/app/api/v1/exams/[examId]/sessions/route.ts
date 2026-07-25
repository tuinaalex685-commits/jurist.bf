import { withRoute } from "@/server/core/http/withRoute";
import { requireUser } from "@/server/modules/auth/session";
import { startSession } from "@/server/modules/exams/service";
import { getRateLimiter } from "@/server/core/ratelimit";
import { AppError } from "@/server/core/errors";

export const dynamic = "force-dynamic";

/** POST /api/v1/exams/:examId/sessions — démarre une session (idempotente). */
export const POST = withRoute<{ params: Promise<{ examId: string }> }>(async (req, _ctx, { params }) => {
  const user = await requireUser();
  const rl = await getRateLimiter("exam-start", 10, 60).limit(user.id);
  if (!rl.success) throw AppError.rateLimited("Trop de tentatives, réessayez dans un instant");

  const { examId } = await params;
  const idempotencyKey = req.headers.get("idempotency-key") ?? undefined;
  return { data: await startSession(examId, idempotencyKey) };
});
