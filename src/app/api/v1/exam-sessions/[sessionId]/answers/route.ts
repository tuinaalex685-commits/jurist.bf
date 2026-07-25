import { withRoute } from "@/server/core/http/withRoute";
import { requireUser } from "@/server/modules/auth/session";
import { AnswerInput } from "@/server/modules/exams/dto";
import { submitAnswer } from "@/server/modules/exams/service";
import { AppError } from "@/server/core/errors";

export const dynamic = "force-dynamic";

/** POST /api/v1/exam-sessions/:sessionId/answers — autosave d'une réponse. */
export const POST = withRoute<{ params: Promise<{ sessionId: string }> }>(async (req, _ctx, { params }) => {
  await requireUser();
  const { sessionId } = await params;
  const raw = await req.json().catch(() => null);
  const parsed = AnswerInput.safeParse(raw);
  if (!parsed.success) throw AppError.validation("Entrée invalide", parsed.error.issues);

  await submitAnswer(sessionId, parsed.data.questionId, parsed.data.answer);
  return { data: { saved: true } };
});
