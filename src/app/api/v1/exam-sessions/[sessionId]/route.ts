import { withRoute } from "@/server/core/http/withRoute";
import { requireUser } from "@/server/modules/auth/session";
import { getSessionView } from "@/server/modules/exams/service";

export const dynamic = "force-dynamic";

/** GET /api/v1/exam-sessions/:sessionId — questions (sans corrigé) + réponses déjà données. */
export const GET = withRoute<{ params: Promise<{ sessionId: string }> }>(async (_req, _ctx, { params }) => {
  const user = await requireUser();
  const { sessionId } = await params;
  return { data: await getSessionView(sessionId, user.id) };
});
