import { withRoute } from "@/server/core/http/withRoute";
import { requireUser } from "@/server/modules/auth/session";
import { RedeemCodeInput } from "@/server/modules/access/dto";
import { redeemAccessCode } from "@/server/modules/access/service";
import { getRateLimiter } from "@/server/core/ratelimit";
import { AppError } from "@/server/core/errors";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/access/codes/redeem
 * Route fine : session → rate-limit → validation Zod → service. Aucune logique métier ici.
 */
export const POST = withRoute(async (req) => {
  const user = await requireUser();

  // Anti-abus : 10 tentatives / minute / utilisateur.
  const rl = await getRateLimiter("redeem", 10, 60).limit(user.id);
  if (!rl.success) throw AppError.rateLimited("Trop de tentatives, réessayez dans un instant");

  const raw = await req.json().catch(() => null);
  const parsed = RedeemCodeInput.safeParse(raw);
  if (!parsed.success) throw AppError.validation("Entrée invalide", parsed.error.issues);

  const result = await redeemAccessCode(parsed.data.code);
  return { data: result };
});
