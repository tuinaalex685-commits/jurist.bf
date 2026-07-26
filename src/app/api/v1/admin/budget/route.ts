import { withRoute } from "@/server/core/http/withRoute";
import { requireRole } from "@/server/modules/auth/session";
import { UpdateBudgetInput } from "@/server/modules/admin/dto";
import { getBudget, updateBudget } from "@/server/modules/admin/service";
import { AppError } from "@/server/core/errors";

export const dynamic = "force-dynamic";

/** GET /api/v1/admin/budget — plafonds IA et état du coupe-circuit. */
export const GET = withRoute(async () => {
  await requireRole("admin");
  return { data: await getBudget() };
});

/**
 * PATCH /api/v1/admin/budget — ajuste les plafonds / (dés)active le coupe-circuit.
 * Réservé `admin` : c'est le robinet de dépense de l'instance.
 */
export const PATCH = withRoute(async (req) => {
  const actor = await requireRole("admin");
  const raw = await req.json().catch(() => null);
  const parsed = UpdateBudgetInput.safeParse(raw);
  if (!parsed.success) throw AppError.validation("Entrée invalide", parsed.error.issues);
  return { data: await updateBudget(parsed.data, actor) };
});
