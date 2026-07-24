import "server-only";
import { createSupabaseServerClient } from "@/server/core/db/server";
import { AppError } from "@/server/core/errors";
import type { Activity, Parcours, PhaseActivities } from "@/server/contracts/learning";

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
