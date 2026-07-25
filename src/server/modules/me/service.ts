import "server-only";
import * as repo from "./repository";
import { getCounts as getSrsCounts } from "@/server/modules/srs/service";
import type { SessionUser } from "@/server/modules/auth/session";
import type { DashboardData, DashboardResume } from "@/server/contracts/me";

const PHASE_NAMES = ["Découverte", "Reconnaissance", "Compréhension", "Mémorisation", "Maîtrise"];

export async function getDashboard(user: SessionUser): Promise<DashboardData> {
  const sb = await repo.client();

  const [stats, ranks, displayName, seals, weaknesses, strengths, latest, revisions] = await Promise.all([
    repo.getStats(sb),
    repo.getRanks(sb),
    repo.getProfileName(sb, user.email?.split("@")[0] ?? "Juriste"),
    repo.getRecentSeals(sb),
    repo.getWeaknesses(sb),
    repo.getStrengths(sb),
    repo.getLatestTouchedArticle(sb),
    getSrsCounts(),
  ]);

  const current = ranks.find((r) => r.level === stats.rank_level) ?? { level: 1, name: "Néophyte", xp_threshold: 0 };
  const next = ranks.find((r) => r.level === stats.rank_level + 1) ?? null;

  let resume: DashboardResume = null;
  let code: DashboardData["code"] = null;

  if (latest) {
    const mastered = await repo.isArticleMastered(sb, latest.article.id);
    const [phaseProg, codeProg, codeName] = await Promise.all([
      repo.getVersionPhaseProgress(sb, latest.versionId),
      repo.getCodeProgress(sb, latest.article.code_id),
      repo.getCodeName(sb, latest.article.code_id),
    ]);

    if (!mastered) {
      const idx = phaseProg.total > 0 ? Math.min(phaseProg.completed, phaseProg.total - 1) : 0;
      resume = {
        articleId: latest.article.id,
        number: latest.article.number,
        notion: latest.article.title ?? `Article ${latest.article.number}`,
        phaseIndex: idx,
        phaseName: PHASE_NAMES[idx] ?? "Découverte",
        progress: phaseProg.total > 0 ? phaseProg.completed / phaseProg.total : 0,
      };
    }
    code = { id: latest.article.code_id, name: codeName, mastered: codeProg.mastered, total: codeProg.total };
  }

  return {
    user: {
      displayName,
      rankLevel: stats.rank_level,
      rankName: current.name,
      nextRankName: next?.name ?? null,
      xpIntoRank: stats.xp_total - current.xp_threshold,
      xpForNextRank: next ? next.xp_threshold - current.xp_threshold : null,
      xpTotal: stats.xp_total,
      streakDays: stats.streak_days,
      masteredCount: stats.mastered_count,
    },
    resume,
    code,
    seals,
    weaknesses,
    strengths,
    revisions,
    // Examens (B6) : valeur neutre pour l'instant.
    unlock: null,
  };
}
