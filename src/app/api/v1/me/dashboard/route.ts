import { withRoute } from "@/server/core/http/withRoute";
import { requireUser } from "@/server/modules/auth/session";
import { getDashboard } from "@/server/modules/me/service";

export const dynamic = "force-dynamic";

/** GET /api/v1/me/dashboard — agrégat du « Poste de commandement » (1 requête). */
export const GET = withRoute(async () => {
  const user = await requireUser();
  return { data: await getDashboard(user) };
});
