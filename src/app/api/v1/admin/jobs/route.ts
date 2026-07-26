import { withRoute } from "@/server/core/http/withRoute";
import { requireRole } from "@/server/modules/auth/session";
import { ListJobsQuery } from "@/server/modules/admin/dto";
import { listJobs } from "@/server/modules/admin/service";
import { AppError } from "@/server/core/errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/jobs?type=&status=&limit=&offset= — file de traitement,
 * tous types confondus (pas seulement `ai.generate`).
 */
export const GET = withRoute(async (req) => {
  await requireRole("content_admin");
  const sp = new URL(req.url).searchParams;
  const parsed = ListJobsQuery.safeParse({
    type: sp.get("type") ?? undefined,
    status: sp.get("status") ?? undefined,
    limit: sp.get("limit") ?? undefined,
    offset: sp.get("offset") ?? undefined,
  });
  if (!parsed.success) throw AppError.validation("Paramètres invalides", parsed.error.issues);

  const page = await listJobs(parsed.data);
  return { data: page.items, meta: { total: page.total, limit: page.limit, offset: page.offset } };
});
