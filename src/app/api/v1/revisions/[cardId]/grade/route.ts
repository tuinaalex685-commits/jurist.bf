import { withRoute } from "@/server/core/http/withRoute";
import { requireUser } from "@/server/modules/auth/session";
import { GradeInput } from "@/server/modules/srs/dto";
import { grade } from "@/server/modules/srs/service";
import { getRateLimiter } from "@/server/core/ratelimit";
import { AppError } from "@/server/core/errors";

export const dynamic = "force-dynamic";

/** POST /api/v1/revisions/:cardId/grade — note une révision (SM-2), reschedule. */
export const POST = withRoute<{ params: Promise<{ cardId: string }> }>(async (req, _ctx, { params }) => {
  const user = await requireUser();
  const rl = await getRateLimiter("srs-grade", 60, 60).limit(user.id);
  if (!rl.success) throw AppError.rateLimited("Trop de notations, ralentissez un instant");

  const { cardId } = await params;
  const raw = await req.json().catch(() => null);
  const parsed = GradeInput.safeParse(raw);
  if (!parsed.success) throw AppError.validation("Entrée invalide", parsed.error.issues);

  return { data: await grade(cardId, parsed.data.grade) };
});
