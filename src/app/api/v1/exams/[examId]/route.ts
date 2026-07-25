import { withRoute } from "@/server/core/http/withRoute";
import { requireUser } from "@/server/modules/auth/session";
import { getBriefing } from "@/server/modules/exams/service";

export const dynamic = "force-dynamic";

/** GET /api/v1/exams/:examId — briefing (matières, difficulté, durée, seuil). */
export const GET = withRoute<{ params: Promise<{ examId: string }> }>(async (_req, _ctx, { params }) => {
  await requireUser();
  const { examId } = await params;
  return { data: await getBriefing(examId) };
});
