import { withRoute } from "@/server/core/http/withRoute";
import { requireRole } from "@/server/modules/auth/session";
import { resolveAlert } from "@/server/modules/admin/service";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/admin/alerts/:alertId/resolve — clôt l'alerte. Si la cause
 * persiste, le prochain passage du moniteur en lèvera une nouvelle.
 */
export const POST = withRoute<{ params: Promise<{ alertId: string }> }>(async (_req, _ctx, { params }) => {
  const actor = await requireRole("admin");
  const { alertId } = await params;
  await resolveAlert(alertId, actor);
  return { data: { resolved: true, alertId } };
});
