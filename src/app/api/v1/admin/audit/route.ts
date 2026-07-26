import { withRoute } from "@/server/core/http/withRoute";
import { requireRole } from "@/server/modules/auth/session";
import { listAudit } from "@/server/modules/admin/service";

export const dynamic = "force-dynamic";

/** GET /api/v1/admin/audit?limit= — journal des actions de pilotage. */
export const GET = withRoute(async (req) => {
  await requireRole("admin");
  const limit = Math.min(Math.max(Number(new URL(req.url).searchParams.get("limit") ?? 50) || 50, 1), 200);
  return { data: await listAudit(limit) };
});
