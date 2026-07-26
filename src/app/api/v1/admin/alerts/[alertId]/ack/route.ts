import { withRoute } from "@/server/core/http/withRoute";
import { requireRole } from "@/server/modules/auth/session";
import { acknowledgeAlert } from "@/server/modules/admin/service";

export const dynamic = "force-dynamic";

/** POST /api/v1/admin/alerts/:alertId/ack — « j'ai vu » (l'alerte reste vivante). */
export const POST = withRoute<{ params: Promise<{ alertId: string }> }>(async (_req, _ctx, { params }) => {
  const actor = await requireRole("admin");
  const { alertId } = await params;
  await acknowledgeAlert(alertId, actor);
  return { data: { acknowledged: true, alertId } };
});
