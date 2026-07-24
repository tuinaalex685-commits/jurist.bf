import "server-only";
import { createSupabaseServerClient } from "@/server/core/db/server";
import { AppError } from "@/server/core/errors";
import type {
  ArticleDetail, ArticleSummary, CodeSummary, CodeTree, SearchHit, StructureNode,
} from "@/server/contracts/catalog";

/** Accès données du Codex. RLS-scoped (client session) → lecture du contenu publié. */

export async function listCodes(): Promise<CodeSummary[]> {
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb
    .from("legal_codes")
    .select("id,name,type,description,position, countries(iso,name), articles(count)")
    .is("archived_at", null)
    .order("position");
  if (error) throw AppError.dependency("Lecture des codes échouée", error);

  return (data ?? []).map((row): CodeSummary => {
    const country = row.countries as unknown as { iso: string; name: string } | null;
    const agg = row.articles as unknown as Array<{ count: number }> | null;
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      description: row.description,
      country: country ? { iso: country.iso, name: country.name } : null,
      articleCount: agg?.[0]?.count ?? 0,
    };
  });
}

export async function getCodeTree(codeId: string): Promise<CodeTree> {
  const sb = await createSupabaseServerClient();

  const { data: code, error: codeErr } = await sb
    .from("legal_codes")
    .select("id,name,type,description")
    .eq("id", codeId)
    .maybeSingle();
  if (codeErr) throw AppError.dependency("Lecture du code échouée", codeErr);
  if (!code) throw AppError.notFound("Code introuvable");

  const { data: nodes, error: nodesErr } = await sb
    .from("structure_nodes")
    .select("id,parent_id,type,label,number,position")
    .eq("code_id", codeId)
    .order("position");
  if (nodesErr) throw AppError.dependency("Lecture de la structure échouée", nodesErr);

  const { data: articles, error: artErr } = await sb
    .from("articles")
    .select("id,number,title,node_id,difficulty,estimated_minutes,current_version_id")
    .eq("code_id", codeId)
    .is("archived_at", null)
    .order("position");
  if (artErr) throw AppError.dependency("Lecture des articles échouée", artErr);

  return {
    code: { id: code.id, name: code.name, type: code.type, description: code.description },
    nodes: (nodes ?? []).map(
      (n): StructureNode => ({
        id: n.id, parentId: n.parent_id, type: n.type, label: n.label, number: n.number, position: n.position,
      }),
    ),
    articles: (articles ?? []).map(
      (a): ArticleSummary => ({
        id: a.id, number: a.number, title: a.title, nodeId: a.node_id,
        difficulty: a.difficulty, estimatedMinutes: a.estimated_minutes,
        published: Boolean(a.current_version_id),
      }),
    ),
  };
}

export async function getArticle(articleId: string): Promise<ArticleDetail> {
  const sb = await createSupabaseServerClient();

  const { data: art, error } = await sb
    .from("articles")
    .select("id,number,title,difficulty,estimated_minutes,current_version_id, legal_codes(id,name)")
    .eq("id", articleId)
    .maybeSingle();
  if (error) throw AppError.dependency("Lecture de l'article échouée", error);
  if (!art) throw AppError.notFound("Article introuvable");

  const codeRel = art.legal_codes as unknown as { id: string; name: string } | null;

  let version: ArticleDetail["version"] = null;
  if (art.current_version_id) {
    const { data: v } = await sb
      .from("article_versions")
      .select("id,version_no,official_text,published_at,status")
      .eq("id", art.current_version_id)
      .eq("status", "published")
      .maybeSingle();
    if (v) {
      version = { id: v.id, versionNo: v.version_no, officialText: v.official_text, publishedAt: v.published_at };
    }
  }

  return {
    id: art.id,
    number: art.number,
    title: art.title,
    difficulty: art.difficulty,
    estimatedMinutes: art.estimated_minutes,
    code: codeRel ? { id: codeRel.id, name: codeRel.name } : { id: "", name: "" },
    version,
  };
}

export async function searchArticles(q: string): Promise<SearchHit[]> {
  const sb = await createSupabaseServerClient();
  // Neutralise les caractères qui casseraient le filtre `.or` de PostgREST.
  const safe = q.replace(/[%,()*]/g, " ").trim();
  if (safe.length < 2) return [];

  const { data, error } = await sb
    .from("articles")
    .select("id,number,title,code_id")
    .or(`number.ilike.%${safe}%,title.ilike.%${safe}%`)
    .is("archived_at", null)
    .limit(20);
  if (error) throw AppError.dependency("Recherche échouée", error);

  return (data ?? []).map((a): SearchHit => ({ id: a.id, number: a.number, title: a.title, codeId: a.code_id }));
}
