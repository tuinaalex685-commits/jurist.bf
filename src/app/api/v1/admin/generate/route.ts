import { withRoute } from "@/server/core/http/withRoute";
import { requireRole } from "@/server/modules/auth/session";
import { GenerateRequestInput } from "@/server/modules/ai/dto";
import { requestGeneration } from "@/server/modules/ai/service";
import { getRateLimiter } from "@/server/core/ratelimit";
import { AppError } from "@/server/core/errors";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/admin/generate — déclenche la génération IA (portée article|code).
 * INVARIANT : réservé content_admin+. Enfile des jobs async — ne bloque jamais
 * la requête, ne consomme le budget/appelle le provider qu'au traitement du job.
 */
export const POST = withRoute(async (req) => {
  const user = await requireRole("content_admin");
  const rl = await getRateLimiter("admin-generate", 20, 60).limit(user.id);
  if (!rl.success) throw AppError.rateLimited("Trop de déclenchements, réessayez dans un instant");

  const raw = await req.json().catch(() => null);
  const parsed = GenerateRequestInput.safeParse(raw);
  if (!parsed.success) throw AppError.validation("Entrée invalide", parsed.error.issues);

  return { data: await requestGeneration(parsed.data, user.id) };
});
