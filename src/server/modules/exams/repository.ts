import "server-only";
import { createSupabaseServerClient } from "@/server/core/db/server";
import { getSupabaseAdmin } from "@/server/core/db/admin";
import { AppError } from "@/server/core/errors";
import type { ExamBriefing, ExamQuestion, ExamResult, ExamSessionStart, ExamSessionView } from "@/server/contracts/exams";

export async function getBriefing(examId: string): Promise<ExamBriefing> {
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb
    .from("exams")
    .select("id,title,difficulty,duration_seconds,pass_threshold,scope")
    .eq("id", examId)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw AppError.dependency("Lecture de l'examen échouée", error);
  if (!data) throw AppError.notFound("Examen introuvable");

  const scope = (data.scope ?? {}) as Record<string, unknown>;
  return {
    id: data.id,
    title: data.title,
    difficulty: data.difficulty,
    durationSeconds: data.duration_seconds,
    passThreshold: Number(data.pass_threshold),
    questionCount: typeof scope.question_count === "number" ? scope.question_count : 5,
  };
}

export async function startSession(examId: string, idempotencyKey?: string): Promise<ExamSessionStart> {
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.rpc("start_exam_session", {
    p_exam_id: examId,
    p_idempotency_key: idempotencyKey ?? null,
  });
  if (error) {
    if (/EXAM_NOT_FOUND/.test(error.message)) throw AppError.notFound("Examen introuvable");
    if (/NO_QUESTIONS_AVAILABLE/.test(error.message)) throw AppError.conflict("Aucune question disponible pour cet examen");
    if (/UNAUTHENTICATED/.test(error.message)) throw AppError.unauthenticated();
    throw AppError.dependency("Démarrage de la session échoué", error);
  }
  const d = data as { session_id: string; already: boolean };
  return { sessionId: d.session_id, already: d.already };
}

/** Vue de session : questions SANS le corrigé (lu via client admin, champ `correct` retiré). */
export async function getSessionView(sessionId: string, userId: string): Promise<ExamSessionView> {
  const sb = await createSupabaseServerClient();
  const { data: session, error } = await sb
    .from("exam_sessions")
    .select("id,exam_id,started_at,submitted_at,user_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw AppError.dependency("Lecture de la session échouée", error);
  if (!session || session.user_id !== userId) throw AppError.notFound("Session introuvable");

  const { data: exam } = await sb.from("exams").select("duration_seconds").eq("id", session.exam_id).maybeSingle();

  const { data: links, error: lErr } = await sb
    .from("exam_session_questions")
    .select("question_id,given_answer")
    .eq("session_id", sessionId);
  if (lErr) throw AppError.dependency("Lecture des questions échouée", lErr);

  const ids = (links ?? []).map((l) => l.question_id);
  const admin = getSupabaseAdmin();
  const { data: bank } = await admin.from("exam_questions_bank").select("id,type,payload").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

  const byId = new Map((bank ?? []).map((b) => [b.id, b]));
  const answers: Record<string, unknown> = {};
  const questions: ExamQuestion[] = (links ?? []).map((l) => {
    const q = byId.get(l.question_id);
    const payload = { ...((q?.payload ?? {}) as Record<string, unknown>) };
    delete payload.correct;
    if (l.given_answer !== null && l.given_answer !== undefined) answers[l.question_id] = l.given_answer;
    return { id: l.question_id, type: q?.type ?? "unknown", prompt: payload };
  });

  return {
    sessionId: session.id,
    examId: session.exam_id,
    startedAt: session.started_at,
    submittedAt: session.submitted_at,
    durationSeconds: exam?.duration_seconds ?? 600,
    questions,
    answers,
  };
}

export async function submitAnswer(sessionId: string, questionId: string, answer: unknown): Promise<void> {
  const sb = await createSupabaseServerClient();
  const { error } = await sb.rpc("submit_exam_answer", { p_session_id: sessionId, p_question_id: questionId, p_answer: answer ?? null });
  if (error) {
    if (/SESSION_NOT_FOUND/.test(error.message)) throw AppError.notFound("Session introuvable ou déjà soumise");
    if (/QUESTION_NOT_IN_SESSION/.test(error.message)) throw AppError.validation("Question hors session");
    throw AppError.dependency("Enregistrement de la réponse échoué", error);
  }
}

export async function submitSession(sessionId: string): Promise<ExamResult> {
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.rpc("submit_exam_session", { p_session_id: sessionId });
  if (error) {
    if (/SESSION_NOT_FOUND/.test(error.message)) throw AppError.notFound("Session introuvable");
    throw AppError.dependency("Soumission de l'examen échouée", error);
  }
  const d = data as { score: number; passed: boolean; correct: number; total: number; xp_gained: number; already: boolean };
  return { score: d.score, passed: d.passed, correct: d.correct ?? 0, total: d.total ?? 0, xpGained: d.xp_gained ?? 0, already: d.already };
}
