import { withRoute } from "@/server/core/http/withRoute";
import { requireUser } from "@/server/modules/auth/session";
import { getCodeTree } from "@/server/modules/catalog/service";

export const dynamic = "force-dynamic";

/** GET /api/v1/catalog/codes/:codeId — arbre du code (structure + articles). */
export const GET = withRoute<{ params: Promise<{ codeId: string }> }>(async (_req, _ctx, { params }) => {
  await requireUser();
  const { codeId } = await params;
  return { data: await getCodeTree(codeId) };
});
