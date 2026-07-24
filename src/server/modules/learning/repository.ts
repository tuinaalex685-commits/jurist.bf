import "server-only";
import { createSupabaseServerClient } from "@/server/core/db/server";
import { AppError } from "@/server/core/errors";
import type {
  Parcours, ParcoursComprehension, ParcoursMemorization, ParcoursSituation,
} from "@/server/contracts/learning";

/** Charge le parcours publié d'un article (RLS-scoped, sans fuiter les réponses). */
export async function getParcours(articleId: string): Promise<Parcours> {
  const sb = await createSupabaseServerClient();

  const { data: art, error } = await sb
    .from("articles")
    .select("id,number,title,current_version_id")
    .eq("id", articleId)
    .maybeSingle();
  if (error) throw AppError.dependency("Lecture de l'article échouée", error);
  if (!art) throw AppError.notFound("Article introuvable");
  if (!art.current_version_id) throw AppError.notFound("Aucun contenu publié pour cet article");

  const versionId = art.current_version_id as string;

  // Requêtes parallélisées (pas de waterfall).
  const [pedRes, sitRes, compRes, memoRes] = await Promise.all([
    sb.from("article_pedagogy").select("intro,why,protects,outcomes").eq("article_version_id", versionId).eq("status", "published").maybeSingle(),
    sb.from("situations").select("id,level,scenario,context,characters,key_facts,question").eq("article_version_id", versionId).eq("status", "published").order("position"),
    sb.from("comprehension_blocks").select("id,type,content").eq("article_version_id", versionId).eq("status", "published").order("position"),
    sb.from("memorization_items").select("id,cloze_template,blanks").eq("article_version_id", versionId).eq("status", "published").order("position"),
  ]);

  const ped = pedRes.data;

  return {
    article: { id: art.id, number: art.number, title: art.title },
    articleVersionId: versionId,
    intro: ped
      ? {
          intro: ped.intro,
          why: ped.why,
          protects: ped.protects,
          outcomes: Array.isArray(ped.outcomes) ? (ped.outcomes as string[]) : [],
        }
      : null,
    situations: (sitRes.data ?? []).map(
      (s): ParcoursSituation => ({
        id: s.id,
        level: s.level,
        scenario: s.scenario,
        context: s.context,
        characters: Array.isArray(s.characters) ? s.characters : [],
        keyFacts: Array.isArray(s.key_facts) ? s.key_facts : [],
        question: s.question,
      }),
    ),
    comprehension: (compRes.data ?? []).map(
      (c): ParcoursComprehension => ({ id: c.id, type: c.type, content: c.content }),
    ),
    memorization: (memoRes.data ?? []).map(
      (m): ParcoursMemorization => ({
        id: m.id,
        clozeTemplate: m.cloze_template,
        blanksCount: Array.isArray(m.blanks) ? m.blanks.length : 0,
      }),
    ),
  };
}
