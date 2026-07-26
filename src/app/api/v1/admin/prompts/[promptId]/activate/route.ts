import { withRoute } from "@/server/core/http/withRoute";
import { requireRole } from "@/server/modules/auth/session";
import { activatePrompt } from "@/server/modules/ai/service";

export const dynamic = "force-dynamic";

/** POST /api/v1/admin/prompts/:promptId/activate — active cette version (désactive l'ancienne). */
export const POST = withRoute<{ params: Promise<{ promptId: string }> }>(async (req, _ctx, { params }) => {
  await requireRole("content_admin");
  const { promptId } = await params;
  const key = new URL(req.url).searchParams.get("key") ?? "master";
  await activatePrompt(promptId, key);
  return { data: { activated: true } };
});
