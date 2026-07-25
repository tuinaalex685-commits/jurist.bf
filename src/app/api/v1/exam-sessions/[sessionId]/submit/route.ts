import { withRoute } from "@/server/core/http/withRoute";
import { requireUser } from "@/server/modules/auth/session";
import { submitSession } from "@/server/modules/exams/service";

export const dynamic = "force-dynamic";

/** POST /api/v1/exam-sessions/:sessionId/submit — corrige et clôture la session. */
export const POST = withRoute<{ params: Promise<{ sessionId: string }> }>(async (_req, _ctx, { params }) => {
  await requireUser();
  const { sessionId } = await params;
  return { data: await submitSession(sessionId) };
});
