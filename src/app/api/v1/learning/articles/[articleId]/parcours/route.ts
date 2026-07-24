import { withRoute } from "@/server/core/http/withRoute";
import { requireUser } from "@/server/modules/auth/session";
import { getParcours } from "@/server/modules/learning/service";

export const dynamic = "force-dynamic";

/** GET /api/v1/learning/articles/:articleId/parcours — contenu publié des phases 0-3. */
export const GET = withRoute<{ params: Promise<{ articleId: string }> }>(async (_req, _ctx, { params }) => {
  await requireUser();
  const { articleId } = await params;
  return { data: await getParcours(articleId) };
});
