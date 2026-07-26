import { withRoute } from "@/server/core/http/withRoute";
import { requireRole } from "@/server/modules/auth/session";
import { listBatches } from "@/server/modules/ai/service";

export const dynamic = "force-dynamic";

/** GET /api/v1/admin/generation-batches — suivi des lots de génération. */
export const GET = withRoute(async () => {
  await requireRole("content_admin");
  return { data: await listBatches() };
});
