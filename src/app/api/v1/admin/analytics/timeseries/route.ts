import { withRoute } from "@/server/core/http/withRoute";
import { requireRole } from "@/server/modules/auth/session";
import { TimeseriesQuery } from "@/server/modules/admin/dto";
import { getTimeseries } from "@/server/modules/admin/service";
import { AppError } from "@/server/core/errors";

export const dynamic = "force-dynamic";

/** GET /api/v1/admin/analytics/timeseries?days=30 — séries journalières zéro-remplies. */
export const GET = withRoute(async (req) => {
  await requireRole("content_admin");
  const parsed = TimeseriesQuery.safeParse({ days: new URL(req.url).searchParams.get("days") ?? undefined });
  if (!parsed.success) throw AppError.validation("Fenêtre invalide", parsed.error.issues);
  return { data: await getTimeseries(parsed.data.days) };
});
