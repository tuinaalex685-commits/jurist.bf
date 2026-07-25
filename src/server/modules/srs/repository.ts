import "server-only";
import { createSupabaseServerClient } from "@/server/core/db/server";
import { AppError } from "@/server/core/errors";
import type { SrsCard, SrsCounts, SrsGradeResult, SrsState } from "@/server/contracts/srs";

const STATES: SrsState[] = ["urgent", "fragile", "correct", "mastered", "anchored"];

export async function getDueCards(limit = 30): Promise<SrsCard[]> {
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb
    .from("srs_cards")
    .select("id,article_id,state,due_at, articles(number,title)")
    .lte("due_at", new Date().toISOString())
    .order("due_at")
    .limit(limit);
  if (error) throw AppError.dependency("Lecture des cartes dues échouée", error);

  return (data ?? []).map((r): SrsCard => {
    const a = r.articles as unknown as { number: string; title: string | null } | null;
    return { id: r.id, articleId: r.article_id, number: a?.number ?? "", title: a?.title ?? null, state: r.state, dueAt: r.due_at };
  });
}

export async function getCounts(): Promise<SrsCounts> {
  const sb = await createSupabaseServerClient();
  const now = new Date();
  const endToday = new Date(now); endToday.setHours(23, 59, 59, 999);
  const endTomorrow = new Date(endToday); endTomorrow.setDate(endTomorrow.getDate() + 1);
  const endWeek = new Date(now); endWeek.setDate(endWeek.getDate() + 7);

  const countUntil = async (iso: string) => {
    const { count } = await sb
      .from("srs_cards")
      .select("*", { count: "exact", head: true })
      .lte("due_at", iso);
    return count ?? 0;
  };

  const [today, tomorrow, week] = await Promise.all([
    countUntil(endToday.toISOString()),
    countUntil(endTomorrow.toISOString()),
    countUntil(endWeek.toISOString()),
  ]);
  return { today, tomorrow, week };
}

export function countsByState(cards: SrsCard[]): Record<SrsState, number> {
  const out = Object.fromEntries(STATES.map((s) => [s, 0])) as Record<SrsState, number>;
  for (const c of cards) out[c.state] = (out[c.state] ?? 0) + 1;
  return out;
}

export async function gradeCard(cardId: string, grade: number): Promise<SrsGradeResult> {
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.rpc("grade_srs_review", { p_card_id: cardId, p_grade: grade });
  if (error) {
    if (/CARD_NOT_FOUND/.test(error.message)) throw AppError.notFound("Carte introuvable");
    if (/UNAUTHENTICATED/.test(error.message)) throw AppError.unauthenticated();
    throw AppError.dependency("Notation de la révision échouée", error);
  }
  const d = data as { state: SrsState; interval_days: number; due_at: string };
  return { state: d.state, intervalDays: d.interval_days, dueAt: d.due_at };
}
