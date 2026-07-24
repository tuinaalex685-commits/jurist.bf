import { withRoute } from "@/server/core/http/withRoute";
import { requireUser } from "@/server/modules/auth/session";
import { getArticle } from "@/server/modules/catalog/service";

export const dynamic = "force-dynamic";

/** GET /api/v1/catalog/articles/:articleId — article + version publiée. */
export const GET = withRoute<{ params: Promise<{ articleId: string }> }>(async (_req, _ctx, { params }) => {
  await requireUser();
  const { articleId } = await params;
  return { data: await getArticle(articleId) };
});
