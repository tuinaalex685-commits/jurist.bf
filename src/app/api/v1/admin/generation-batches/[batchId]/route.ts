import { withRoute } from "@/server/core/http/withRoute";
import { requireRole } from "@/server/modules/auth/session";
import { getBatch } from "@/server/modules/ai/service";

export const dynamic = "force-dynamic";

/** GET /api/v1/admin/generation-batches/:batchId — détail + progression d'un lot. */
export const GET = withRoute<{ params: Promise<{ batchId: string }> }>(async (_req, _ctx, { params }) => {
  await requireRole("content_admin");
  const { batchId } = await params;
  return { data: await getBatch(batchId) };
});
