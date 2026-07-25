import "server-only";
import { createSupabaseServerClient } from "@/server/core/db/server";
import { getSupabaseAdmin } from "@/server/core/db/admin";
import { AppError } from "@/server/core/errors";
import type { Activity, Parcours, PhaseActivities } from "@/server/contracts/learning";

/** Données de correction (SECRÈTES) — lues via le client admin (jamais exposées au client). */
export async function getGradingData(activityId: string): Promise<{
  type: string;
  articleVersionId: string;
  solution: Record<string, unknown>;
  evaluation: Record<string, unknown>;
  feedback: Record<string, unknown>;
}> {
  const admin = getSupabaseAdmin();

  const { data: act, error: aErr } = await admin
    .from("activities")
    .select("type,status,article_version_id")
    .eq("id", activityId)
    .maybeSingle();
  if (aErr) throw AppError.dependency("Lecture de l'activité échouée", aErr);
  if (!act || act.status !== "published") throw AppError.notFound("Activité introuvable");

  const { data: sol } = await admin
    .from("activity_solutions")
    .select("solution,evaluation,feedback")
    .eq("activity_id", activityId)
    .maybeSingle();

  return {
    type: act.type,
    articleVersionId: act.article_version_id as string,
    solution: (sol?.solution ?? {}) as Record<string, unknown>,
    evaluation: (sol?.evaluation ?? {}) as Record<string, unknown>,
    feedback: (sol?.feedback ?? {}) as Record<string, unknown>,
  };
}

/** Décerne la maîtrise si toutes les phases sont validées (idempotent, RLS). */
export async function awardMasteryIfComplete(articleVersionId: string): Promise<{
  mastered: boolean;
  new?: boolean;
  already?: boolean;
  xp_gained?: number;
  xp_total?: number;
  rank_level?: number;
}> {
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.rpc("award_article_mastery", { p_version: articleVersionId });
  if (error) throw AppError.dependency("Attribution de la maîtrise échouée", error);
  return data as { mastered: boolean; new?: boolean; xp_gained?: number; xp_total?: number; rank_level?: number };
}

/** Enregistre la tentative + recalcule la progression de phase (RPC transactionnelle, RLS). */
export async function recordAttempt(
  activityId: string,
  response: unknown,
  score: number,
  passed: boolean,
  detail: Record<string, unknown>,
): Promise<{ phase: number; phase_score: number; phase_completed: boolean }> {
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.rpc("record_activity_attempt", {
    p_activity_id: activityId,
    p_response: response ?? {},
    p_score: score,
    p_passed: passed,
    p_detail: detail ?? {},
  });
  if (error) {
    if (/ACTIVITY_NOT_FOUND/.test(error.message)) throw AppError.notFound("Activité introuvable");
    if (/UNAUTHENTICATED/.test(error.message)) throw AppError.unauthenticated();
    throw AppError.dependency("Enregistrement de la tentative échoué", error);
  }
  return data as { phase: number; phase_score: number; phase_completed: boolean };
}

/**
 * Charge le parcours publié d'un article : ses activités groupées par phase.
 * RLS-scoped (contenu `published` uniquement) — les solutions ne sont PAS lues ici.
 */
export async function getParcours(articleId: string): Promise<Parcours> {
  const sb = await createSupabaseServerClient();

  const { data: art, error: artErr } = await sb
    .from("articles")
    .select("id,number,title,current_version_id")
    .eq("id", articleId)
    .maybeSingle();
  if (artErr) throw AppError.dependency("Lecture de l'article échouée", artErr);
  if (!art) throw AppError.notFound("Article introuvable");
  if (!art.current_version_id) throw AppError.notFound("Aucun contenu publié pour cet article");

  const versionId = art.current_version_id as string;

  const { data: rows, error } = await sb
    .from("activities")
    .select("id,phase,position,type,objective,difficulty,weight,prompt")
    .eq("article_version_id", versionId)
    .eq("status", "published")
    .order("phase")
    .order("position");
  if (error) throw AppError.dependency("Lecture des activités échouée", error);

  const byPhase = new Map<number, Activity[]>();
  for (const r of rows ?? []) {
    const activity: Activity = {
      id: r.id,
      phase: r.phase,
      position: r.position,
      type: r.type,
      objective: r.objective,
      difficulty: r.difficulty,
      weight: Number(r.weight),
      prompt: (r.prompt ?? {}) as Record<string, unknown>,
    };
    const list = byPhase.get(r.phase) ?? [];
    list.push(activity);
    byPhase.set(r.phase, list);
  }

  const phases: PhaseActivities[] = [...byPhase.entries()]
    .sort(([a], [b]) => a - b)
    .map(([phase, activities]) => ({ phase, activities }));

  return {
    article: { id: art.id, number: art.number, title: art.title },
    articleVersionId: versionId,
    phases,
  };
}
