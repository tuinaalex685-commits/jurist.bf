import "server-only";
import { getSupabaseAdmin } from "@/server/core/db/admin";
import { AppError } from "@/server/core/errors";
import type { AlertSeverity } from "@/server/contracts/admin";

const admin = () => getSupabaseAdmin();

// ---------------------------------------------------------------------------
// Agrégats (tout est calculé côté SQL — voir migration 0016)
// ---------------------------------------------------------------------------
export async function fetchOverview(): Promise<Record<string, unknown>> {
  const { data, error } = await admin().rpc("admin_overview");
  if (error) throw AppError.dependency("Lecture des indicateurs échouée", error);
  return (data ?? {}) as Record<string, unknown>;
}

export interface TimeseriesRow {
  day: string;
  new_users: number;
  active_users: number;
  xp_earned: number;
  exam_sessions: number;
  reviews: number;
  seals: number;
  ai_cost_usd: number;
  ai_generations: number;
}

export async function fetchTimeseries(days: number): Promise<TimeseriesRow[]> {
  const { data, error } = await admin().rpc("admin_timeseries", { p_days: days });
  if (error) throw AppError.dependency("Lecture des séries temporelles échouée", error);
  return (data ?? []) as TimeseriesRow[];
}

export async function fetchAiUsageSummary(): Promise<Record<string, unknown>> {
  const { data, error } = await admin().rpc("admin_ai_usage_summary");
  if (error) throw AppError.dependency("Lecture de la consommation IA échouée", error);
  return (data ?? {}) as Record<string, unknown>;
}

export async function fetchJobsHealth(): Promise<Record<string, unknown>> {
  const { data, error } = await admin().rpc("admin_jobs_health");
  if (error) throw AppError.dependency("Lecture de la santé de la file échouée", error);
  return (data ?? {}) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Utilisateurs
// ---------------------------------------------------------------------------
export interface AdminUserSqlRow {
  id: string;
  email: string | null;
  display_name: string | null;
  role: "student" | "content_admin" | "admin";
  suspended_at: string | null;
  created_at: string;
  xp_total: number;
  rank_level: number;
  streak_days: number;
  mastered_count: number;
  last_active_on: string | null;
  sub_status: string | null;
  total_count: number;
}

export async function listUsers(params: {
  search?: string;
  role?: string;
  limit: number;
  offset: number;
}): Promise<AdminUserSqlRow[]> {
  const { data, error } = await admin().rpc("admin_list_users", {
    p_search: params.search ?? null,
    p_role: params.role ?? null,
    p_limit: params.limit,
    p_offset: params.offset,
  });
  if (error) throw AppError.dependency("Lecture des utilisateurs échouée", error);
  return (data ?? []) as AdminUserSqlRow[];
}

export async function getUserDetail(userId: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await admin().rpc("admin_user_detail", { p_user_id: userId });
  if (error) throw AppError.dependency("Lecture de la fiche utilisateur échouée", error);
  return (data ?? null) as Record<string, unknown> | null;
}

export async function updateUser(
  userId: string,
  patch: { role?: string; suspended?: boolean },
): Promise<void> {
  const values: Record<string, unknown> = {};
  if (patch.role !== undefined) values.role = patch.role;
  if (patch.suspended !== undefined) values.suspended_at = patch.suspended ? new Date().toISOString() : null;

  const { error } = await admin().from("profiles").update(values).eq("id", userId);
  if (error) throw AppError.dependency("Mise à jour de l'utilisateur échouée", error);
}

export async function countAdmins(): Promise<number> {
  const { count, error } = await admin()
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin");
  if (error) throw AppError.dependency("Comptage des administrateurs échoué", error);
  return count ?? 0;
}

export async function getUserRole(userId: string): Promise<string | null> {
  const { data, error } = await admin().from("profiles").select("role").eq("id", userId).maybeSingle();
  if (error) throw AppError.dependency("Lecture du rôle échouée", error);
  return data?.role ?? null;
}

// ---------------------------------------------------------------------------
// Jobs (file de traitement) — vue transverse, tous types confondus
// ---------------------------------------------------------------------------
export interface JobSqlRow {
  id: string;
  type: string;
  status: string;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  payload: Record<string, unknown>;
  run_after: string;
  created_at: string;
  updated_at: string;
}

export async function listJobs(params: {
  type?: string;
  status?: string;
  limit: number;
  offset: number;
}): Promise<{ rows: JobSqlRow[]; total: number }> {
  let q = admin()
    .from("jobs")
    .select("id,type,status,attempts,max_attempts,last_error,payload,run_after,created_at,updated_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (params.type) q = q.eq("type", params.type);
  if (params.status) q = q.eq("status", params.status);

  const { data, error, count } = await q;
  if (error) throw AppError.dependency("Lecture des jobs échouée", error);
  return { rows: (data ?? []) as JobSqlRow[], total: count ?? 0 };
}

export async function getJob(id: string): Promise<JobSqlRow | null> {
  const { data, error } = await admin()
    .from("jobs")
    .select("id,type,status,attempts,max_attempts,last_error,payload,run_after,created_at,updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw AppError.dependency("Lecture du job échouée", error);
  return (data ?? null) as JobSqlRow | null;
}

/** Remet un job en file. Réservé aux jobs `error`/`dead` (jamais un job en cours). */
export async function requeueJob(id: string): Promise<void> {
  const { error } = await admin()
    .from("jobs")
    .update({ status: "pending", attempts: 0, last_error: null, run_after: new Date().toISOString() })
    .eq("id", id);
  if (error) throw AppError.dependency("Relance du job échouée", error);
}

// ---------------------------------------------------------------------------
// Alertes système
// ---------------------------------------------------------------------------
export interface AlertSqlRow {
  id: string;
  kind: string;
  severity: AlertSeverity;
  title: string;
  body: string | null;
  meta: Record<string, unknown>;
  occurrences: number;
  first_seen_at: string;
  last_seen_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
}

export async function listAlerts(params: {
  includeResolved: boolean;
  limit: number;
}): Promise<AlertSqlRow[]> {
  let q = admin()
    .from("system_alerts")
    .select("id,kind,severity,title,body,meta,occurrences,first_seen_at,last_seen_at,acknowledged_at,resolved_at")
    .order("last_seen_at", { ascending: false })
    .limit(params.limit);
  if (!params.includeResolved) q = q.is("resolved_at", null);

  const { data, error } = await q;
  if (error) throw AppError.dependency("Lecture des alertes échouée", error);
  return (data ?? []) as AlertSqlRow[];
}

export async function raiseAlert(input: {
  kind: string;
  severity: AlertSeverity;
  title: string;
  body?: string;
  meta?: Record<string, unknown>;
  fingerprint?: string;
}): Promise<string | null> {
  const { data, error } = await admin().rpc("raise_alert", {
    p_kind: input.kind,
    p_severity: input.severity,
    p_title: input.title,
    p_body: input.body ?? null,
    p_meta: input.meta ?? {},
    p_fingerprint: input.fingerprint ?? input.kind,
  });
  if (error) throw AppError.dependency("Levée d'alerte échouée", error);
  return (data ?? null) as string | null;
}

export async function resolveAlertsByFingerprint(fingerprint: string): Promise<number> {
  const { data, error } = await admin().rpc("resolve_alerts", { p_fingerprint: fingerprint });
  if (error) throw AppError.dependency("Résolution des alertes échouée", error);
  return (data ?? 0) as number;
}

export async function acknowledgeAlert(id: string, userId: string): Promise<void> {
  const { error } = await admin()
    .from("system_alerts")
    .update({ acknowledged_at: new Date().toISOString(), acknowledged_by: userId })
    .eq("id", id);
  if (error) throw AppError.dependency("Accusé de réception échoué", error);
}

export async function resolveAlert(id: string): Promise<void> {
  const { error } = await admin()
    .from("system_alerts")
    .update({ resolved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw AppError.dependency("Clôture de l'alerte échouée", error);
}

// ---------------------------------------------------------------------------
// Budget IA
// ---------------------------------------------------------------------------
export async function getBudgetConfig() {
  const { data, error } = await admin()
    .from("ai_budget_config")
    .select("monthly_usd,daily_usd,circuit_open,updated_at")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw AppError.dependency("Lecture du budget échouée", error);
  return data;
}

export async function updateBudgetConfig(patch: {
  monthlyUsd?: number;
  dailyUsd?: number;
  circuitOpen?: boolean;
}) {
  const values: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.monthlyUsd !== undefined) values.monthly_usd = patch.monthlyUsd;
  if (patch.dailyUsd !== undefined) values.daily_usd = patch.dailyUsd;
  if (patch.circuitOpen !== undefined) values.circuit_open = patch.circuitOpen;

  const { error } = await admin().from("ai_budget_config").update(values).eq("id", 1);
  if (error) throw AppError.dependency("Mise à jour du budget échouée", error);
}

// ---------------------------------------------------------------------------
// Journal d'audit — toute action de pilotage laisse une trace.
// ---------------------------------------------------------------------------
export async function writeAudit(entry: {
  actorId: string;
  actorRole: string;
  action: string;
  targetType?: string;
  targetId?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await admin().from("audit_logs").insert({
    actor_id: entry.actorId,
    actor_role: entry.actorRole,
    action: entry.action,
    target_type: entry.targetType ?? null,
    target_id: entry.targetId ?? null,
    meta: entry.meta ?? {},
  });
  // L'audit ne doit jamais faire échouer l'action métier — on journalise seulement.
  if (error) throw AppError.dependency("Écriture du journal d'audit échouée", error);
}

export async function listAudit(limit = 50) {
  const { data, error } = await admin()
    .from("audit_logs")
    .select("id,actor_id,actor_role,action,target_type,target_id,meta,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw AppError.dependency("Lecture du journal d'audit échouée", error);
  return data ?? [];
}
