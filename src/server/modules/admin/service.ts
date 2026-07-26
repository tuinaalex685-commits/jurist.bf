import "server-only";
import { AppError } from "@/server/core/errors";
import { logger } from "@/server/core/logging/logger";
import type { SessionUser } from "@/server/modules/auth/session";
import * as repo from "./repository";
import type { ListAlertsQuery, ListJobsQuery, ListUsersQuery, UpdateBudgetInput, UpdateUserInput } from "./dto";
import type {
  AdminOverview,
  AdminUserDetail,
  AdminUserRow,
  AiUsageDetail,
  BudgetConfig,
  JobsHealth,
  OffsetPage,
  SystemAlert,
  TimeseriesPoint,
} from "@/server/contracts/admin";

/** PostgREST renvoie les `numeric` en chaîne selon le contexte — on normalise toujours. */
const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// ---------------------------------------------------------------------------
// Vue d'ensemble & analytics
// ---------------------------------------------------------------------------
export async function getOverview(): Promise<AdminOverview> {
  // La fonction SQL construit déjà la forme exacte du contrat : on se contente
  // de normaliser les nombres (numeric → number) sans recopier la structure.
  const raw = (await repo.fetchOverview()) as unknown as AdminOverview;
  return {
    ...raw,
    learning: { ...raw.learning, examPassRate: num(raw.learning?.examPassRate) },
    ai: normalizeAiUsage(raw.ai as unknown as Record<string, unknown>),
    jobs: normalizeJobsHealth(raw.jobs as unknown as Record<string, unknown>),
  };
}

export async function getTimeseries(days: number): Promise<TimeseriesPoint[]> {
  const rows = await repo.fetchTimeseries(days);
  return rows.map((r) => ({
    day: String(r.day),
    newUsers: num(r.new_users),
    activeUsers: num(r.active_users),
    xpEarned: num(r.xp_earned),
    examSessions: num(r.exam_sessions),
    reviews: num(r.reviews),
    seals: num(r.seals),
    aiCostUsd: num(r.ai_cost_usd),
    aiGenerations: num(r.ai_generations),
  }));
}

function normalizeAiUsage(raw: Record<string, unknown>): AiUsageDetail {
  return {
    todayCostUsd: num(raw?.todayCostUsd),
    monthCostUsd: num(raw?.monthCostUsd),
    dailyLimitUsd: num(raw?.dailyLimitUsd, 5),
    monthlyLimitUsd: num(raw?.monthlyLimitUsd, 50),
    circuitOpen: Boolean(raw?.circuitOpen),
    totalGenerations: num(raw?.totalGenerations),
    totalCostUsd: num(raw?.totalCostUsd),
    totalTokensIn: num(raw?.totalTokensIn),
    totalTokensOut: num(raw?.totalTokensOut),
    cacheHitRate: num(raw?.cacheHitRate),
  };
}

function normalizeJobsHealth(raw: Record<string, unknown>): JobsHealth {
  return {
    pending: num(raw?.pending),
    running: num(raw?.running),
    error: num(raw?.error),
    dead: num(raw?.dead),
    done: num(raw?.done),
    oldestPendingAgeS: num(raw?.oldestPendingAgeS),
    lastCompletedAt: (raw?.lastCompletedAt as string | null) ?? null,
  };
}

export async function getAiUsageDetail(): Promise<AiUsageDetail> {
  return normalizeAiUsage(await repo.fetchAiUsageSummary());
}

export async function getJobsHealth(): Promise<JobsHealth> {
  return normalizeJobsHealth(await repo.fetchJobsHealth());
}

// ---------------------------------------------------------------------------
// Utilisateurs
// ---------------------------------------------------------------------------
export async function listUsers(query: ListUsersQuery): Promise<OffsetPage<AdminUserRow>> {
  const rows = await repo.listUsers(query);
  return {
    items: rows.map((r) => ({
      id: r.id,
      email: r.email,
      displayName: r.display_name,
      role: r.role,
      suspendedAt: r.suspended_at,
      createdAt: r.created_at,
      xpTotal: num(r.xp_total),
      rankLevel: num(r.rank_level, 1),
      streakDays: num(r.streak_days),
      masteredCount: num(r.mastered_count),
      lastActiveOn: r.last_active_on,
      subStatus: r.sub_status,
    })),
    // `total_count` est identique sur toutes les lignes (fonction fenêtre) ; 0 si page vide.
    total: rows.length > 0 ? num(rows[0].total_count) : 0,
    limit: query.limit,
    offset: query.offset,
  };
}

export async function getUserDetail(userId: string): Promise<AdminUserDetail> {
  const raw = await repo.getUserDetail(userId);
  if (!raw) throw AppError.notFound("Utilisateur introuvable");
  return raw as unknown as AdminUserDetail;
}

/**
 * Change le rôle et/ou suspend un compte.
 *
 * GARDE-FOUS (une console d'admin doit être impossible à verrouiller) :
 *  - on ne modifie jamais son propre compte depuis le cockpit,
 *  - on ne retire jamais le dernier `admin` de l'instance.
 */
export async function updateUser(
  targetUserId: string,
  input: UpdateUserInput,
  actor: SessionUser,
): Promise<void> {
  if (targetUserId === actor.id) {
    throw AppError.conflict("Vous ne pouvez pas modifier votre propre compte depuis le cockpit");
  }

  const currentRole = await repo.getUserRole(targetUserId);
  if (!currentRole) throw AppError.notFound("Utilisateur introuvable");

  const losesAdmin =
    currentRole === "admin" && ((input.role !== undefined && input.role !== "admin") || input.suspended === true);
  if (losesAdmin && (await repo.countAdmins()) <= 1) {
    throw AppError.conflict("Impossible de retirer le dernier administrateur de l'instance");
  }

  await repo.updateUser(targetUserId, input);
  await repo.writeAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: "admin.user.update",
    targetType: "profile",
    targetId: targetUserId,
    meta: { ...input, previousRole: currentRole },
  });
  logger.info("admin_user_updated", { actorId: actor.id, targetUserId, ...input });
}

// ---------------------------------------------------------------------------
// File de traitement
// ---------------------------------------------------------------------------
export async function listJobs(query: ListJobsQuery) {
  const { rows, total } = await repo.listJobs(query);
  return {
    items: rows.map((j) => ({
      id: j.id,
      type: j.type,
      status: j.status,
      attempts: num(j.attempts),
      maxAttempts: num(j.max_attempts),
      lastError: j.last_error,
      payload: j.payload,
      runAfter: j.run_after,
      createdAt: j.created_at,
      updatedAt: j.updated_at,
    })),
    total,
    limit: query.limit,
    offset: query.offset,
  };
}

/** Relance un job échoué. Un job `pending`/`running`/`done` n'est jamais rejouable. */
export async function retryJob(jobId: string, actor: SessionUser): Promise<void> {
  const job = await repo.getJob(jobId);
  if (!job) throw AppError.notFound("Job introuvable");
  if (!["error", "dead"].includes(job.status)) {
    throw AppError.conflict("Seul un job en erreur ou abandonné peut être relancé");
  }

  await repo.requeueJob(jobId);
  await repo.writeAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: "admin.job.retry",
    targetType: "job",
    targetId: jobId,
    meta: { type: job.type, previousStatus: job.status, attempts: job.attempts },
  });
  logger.info("admin_job_retried", { actorId: actor.id, jobId, type: job.type });
}

// ---------------------------------------------------------------------------
// Alertes
// ---------------------------------------------------------------------------
export async function listAlerts(query: ListAlertsQuery): Promise<SystemAlert[]> {
  const rows = await repo.listAlerts({ includeResolved: query.includeResolved ?? false, limit: query.limit });
  return rows.map((a) => ({
    id: a.id,
    kind: a.kind,
    severity: a.severity,
    title: a.title,
    body: a.body,
    meta: a.meta ?? {},
    occurrences: num(a.occurrences, 1),
    firstSeenAt: a.first_seen_at,
    lastSeenAt: a.last_seen_at,
    acknowledgedAt: a.acknowledged_at,
    resolvedAt: a.resolved_at,
  }));
}

export async function acknowledgeAlert(id: string, actor: SessionUser): Promise<void> {
  await repo.acknowledgeAlert(id, actor.id);
  await repo.writeAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: "admin.alert.ack",
    targetType: "system_alert",
    targetId: id,
  });
}

export async function resolveAlert(id: string, actor: SessionUser): Promise<void> {
  await repo.resolveAlert(id);
  await repo.writeAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: "admin.alert.resolve",
    targetType: "system_alert",
    targetId: id,
  });
}

// ---------------------------------------------------------------------------
// Budget IA — le levier de rentabilité le plus direct du cockpit.
// ---------------------------------------------------------------------------
export async function getBudget(): Promise<BudgetConfig> {
  const row = await repo.getBudgetConfig();
  return {
    monthlyUsd: num(row?.monthly_usd, 50),
    dailyUsd: num(row?.daily_usd, 5),
    circuitOpen: Boolean(row?.circuit_open),
    updatedAt: row?.updated_at ?? null,
  };
}

export async function updateBudget(input: UpdateBudgetInput, actor: SessionUser): Promise<BudgetConfig> {
  await repo.updateBudgetConfig(input);
  await repo.writeAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: "admin.budget.update",
    targetType: "ai_budget_config",
    meta: input,
  });
  logger.warn("admin_budget_updated", { actorId: actor.id, ...input });

  // Rouvrir le robinet doit effacer l'alerte correspondante, sinon le cockpit
  // resterait rouge après correction.
  if (input.circuitOpen === false) await repo.resolveAlertsByFingerprint("circuit_open");
  return getBudget();
}

// ---------------------------------------------------------------------------
// Journal d'audit
// ---------------------------------------------------------------------------
export async function listAudit(limit = 50) {
  const rows = await repo.listAudit(limit);
  return rows.map((a) => ({
    id: a.id,
    actorId: a.actor_id,
    actorRole: a.actor_role,
    action: a.action,
    targetType: a.target_type,
    targetId: a.target_id,
    meta: a.meta,
    createdAt: a.created_at,
  }));
}
