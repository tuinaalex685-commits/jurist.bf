import { withRoute } from "@/server/core/http/withRoute";
import { requireRole } from "@/server/modules/auth/session";
import { getUsageSummary } from "@/server/modules/ai/service";

export const dynamic = "force-dynamic";

/** GET /api/v1/admin/ai/usage — coûts jour/mois, budget, coupe-circuit, taux de cache. */
export const GET = withRoute(async () => {
  await requireRole("content_admin");
  return { data: await getUsageSummary() };
});
