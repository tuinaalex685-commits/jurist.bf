import { withRoute } from "@/server/core/http/withRoute";
import { requireRole } from "@/server/modules/auth/session";
import { ListAlertsQuery } from "@/server/modules/admin/dto";
import { listAlerts } from "@/server/modules/admin/service";
import { AppError } from "@/server/core/errors";

export const dynamic = "force-dynamic";

/** GET /api/v1/admin/alerts?includeResolved=&limit= — alertes système (vivantes par défaut). */
export const GET = withRoute(async (req) => {
  await requireRole("admin");
  const sp = new URL(req.url).searchParams;
  const parsed = ListAlertsQuery.safeParse({
    includeResolved: sp.get("includeResolved") ?? undefined,
    limit: sp.get("limit") ?? undefined,
  });
  if (!parsed.success) throw AppError.validation("Paramètres invalides", parsed.error.issues);
  return { data: await listAlerts(parsed.data) };
});
