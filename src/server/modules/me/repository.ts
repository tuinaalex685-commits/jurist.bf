import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/server/core/db/server";

/** Client de session (RLS = l'utilisateur ne lit que ses données). */
export const client = () => createSupabaseServerClient();

export async function getStats(sb: SupabaseClient) {
  const { data } = await sb
    .from("user_stats")
    .select("xp_total,rank_level,streak_days,mastered_count")
    .maybeSingle();
  return data ?? { xp_total: 0, rank_level: 1, streak_days: 0, mastered_count: 0 };
}

export async function getProfileName(sb: SupabaseClient, fallback: string) {
  const { data } = await sb.from("profiles").select("display_name").maybeSingle();
  return data?.display_name ?? fallback;
}

export async function getRanks(sb: SupabaseClient) {
  const { data } = await sb.from("ranks").select("level,name,xp_threshold").order("level");
  return (data ?? []) as { level: number; name: string; xp_threshold: number }[];
}

export async function getRecentSeals(sb: SupabaseClient) {
  const { data } = await sb
    .from("seals")
    .select("id, articles(number,title)")
    .order("earned_at", { ascending: false })
    .limit(6);
  return (data ?? []).map((s) => {
    const a = s.articles as unknown as { number: string; title: string | null } | null;
    return { id: s.id as string, articleNumber: a?.number ?? "", title: a?.title ?? null };
  });
}

/** Faiblesses = notions confondues, agrégées depuis le diagnostic des tentatives. */
export async function getWeaknesses(sb: SupabaseClient) {
  const { data } = await sb
    .from("activity_attempts")
    .select("detail")
    .not("detail->>confusion", "is", null)
    .limit(200);
  const counts = new Map<string, number>();
  for (const r of data ?? []) {
    const c = (r.detail as Record<string, unknown> | null)?.confusion;
    if (typeof c === "string") counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => k);
}

/** Forces = articles maîtrisés (par titre). */
export async function getStrengths(sb: SupabaseClient) {
  const { data } = await sb
    .from("seals")
    .select("articles(title)")
    .order("earned_at", { ascending: false })
    .limit(4);
  return (data ?? [])
    .map((s) => (s.articles as unknown as { title: string | null } | null)?.title)
    .filter((t): t is string => !!t);
}

/** Dernier article touché (via la dernière tentative) → base de la reprise. */
export async function getLatestTouchedArticle(sb: SupabaseClient) {
  const { data: la } = await sb
    .from("activity_attempts")
    .select("activity_id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!la) return null;

  const { data: act } = await sb
    .from("activities")
    .select("article_version_id")
    .eq("id", la.activity_id)
    .maybeSingle();
  if (!act) return null;
  const versionId = act.article_version_id as string;

  // Requête séparée (l'embed article_versions→articles est ambigu : 2 FK entre ces tables).
  const { data: ver } = await sb
    .from("article_versions")
    .select("article_id")
    .eq("id", versionId)
    .maybeSingle();
  if (!ver) return null;

  const { data: article } = await sb
    .from("articles")
    .select("id,number,title,code_id,current_version_id")
    .eq("id", ver.article_id)
    .maybeSingle();
  if (!article) return null;

  return {
    versionId,
    article: article as {
      id: string;
      number: string;
      title: string | null;
      code_id: string;
      current_version_id: string | null;
    },
  };
}

/** Progression de phases pour une version (complétées / total). */
export async function getVersionPhaseProgress(sb: SupabaseClient, versionId: string) {
  const { data: acts } = await sb
    .from("activities")
    .select("phase")
    .eq("article_version_id", versionId)
    .eq("status", "published");
  const total = new Set((acts ?? []).map((a) => a.phase)).size;

  const { count: completed } = await sb
    .from("user_phase_progress")
    .select("*", { count: "exact", head: true })
    .eq("article_version_id", versionId)
    .eq("status", "completed");

  return { total, completed: completed ?? 0 };
}

/** Progression d'un code : maîtrisés (sceaux) / total d'articles. */
export async function getCodeProgress(sb: SupabaseClient, codeId: string) {
  const { count: total } = await sb
    .from("articles")
    .select("*", { count: "exact", head: true })
    .eq("code_id", codeId)
    .is("archived_at", null);

  const { data: arts } = await sb.from("articles").select("id").eq("code_id", codeId);
  const ids = (arts ?? []).map((a) => a.id);
  let mastered = 0;
  if (ids.length) {
    const { count } = await sb
      .from("seals")
      .select("*", { count: "exact", head: true })
      .in("article_id", ids);
    mastered = count ?? 0;
  }
  return { total: total ?? 0, mastered };
}

export async function getCodeName(sb: SupabaseClient, codeId: string) {
  const { data } = await sb.from("legal_codes").select("name").eq("id", codeId).maybeSingle();
  return data?.name ?? "";
}

export async function isArticleMastered(sb: SupabaseClient, articleId: string) {
  const { count } = await sb
    .from("seals")
    .select("*", { count: "exact", head: true })
    .eq("article_id", articleId);
  return (count ?? 0) > 0;
}
