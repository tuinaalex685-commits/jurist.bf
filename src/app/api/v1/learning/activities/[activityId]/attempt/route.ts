import { withRoute } from "@/server/core/http/withRoute";
import { requireUser } from "@/server/modules/auth/session";
import { AttemptInput } from "@/server/modules/learning/dto";
import { submitAttempt } from "@/server/modules/learning/service";
import { getRateLimiter } from "@/server/core/ratelimit";
import { AppError } from "@/server/core/errors";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/learning/activities/:activityId/attempt
 * Notation côté serveur (jamais côté client) + progression. Route fine.
 */
export const POST = withRoute<{ params: Promise<{ activityId: string }> }>(async (req, _ctx, { params }) => {
  const user = await requireUser();

  const rl = await getRateLimiter("attempt", 90, 60).limit(user.id);
  if (!rl.success) throw AppError.rateLimited("Trop de soumissions, ralentissez un instant");

  const { activityId } = await params;
  const raw = await req.json().catch(() => null);
  const parsed = AttemptInput.safeParse(raw);
  if (!parsed.success) throw AppError.validation("Entrée invalide", parsed.error.issues);

  return { data: await submitAttempt(activityId, parsed.data.response) };
});
