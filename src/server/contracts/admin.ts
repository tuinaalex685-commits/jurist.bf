/**
 * Contrats du Cockpit Admin (B9). Importables par le frontend : ce sont ces
 * types qui décrivent l'écran de pilotage, jamais les lignes brutes de la base.
 */

export type AdminOverview = {
  users: {
    total: number;
    new7d: number;
    new30d: number;
    active7d: number;
    active30d: number;
    suspended: number;
    admins: number;
  };
  revenue: {
    paidTotalCents: number;
    paid30dCents: number;
    currency: string;
    activeSubs: number;
    trialingSubs: number;
    pastDueSubs: number;
    codesUnused: number;
    codesActive: number;
  };
  content: {
    codes: number;
    articles: number;
    versionsPublished: number;
    activitiesDraft: number;
    activitiesPublished: number;
    examQuestions: number;
  };
  learning: {
    seals: number;
    seals7d: number;
    xpTotal: number;
    examSessions: number;
    examPassRate: number;
    srsDueNow: number;
  };
  ai: AiUsageDetail;
  jobs: JobsHealth;
  alerts: { open: number; critical: number; unacked: number };
};

export type AiUsageDetail = {
  todayCostUsd: number;
  monthCostUsd: number;
  dailyLimitUsd: number;
  monthlyLimitUsd: number;
  circuitOpen: boolean;
  totalGenerations: number;
  totalCostUsd: number;
  totalTokensIn: number;
  totalTokensOut: number;
  cacheHitRate: number;
};

export type JobsHealth = {
  pending: number;
  running: number;
  error: number;
  dead: number;
  done: number;
  /** Âge du plus vieux job exigible non traité — révèle un worker à l'arrêt. */
  oldestPendingAgeS: number;
  lastCompletedAt: string | null;
};

export type TimeseriesPoint = {
  day: string;
  newUsers: number;
  activeUsers: number;
  xpEarned: number;
  examSessions: number;
  reviews: number;
  seals: number;
  aiCostUsd: number;
  aiGenerations: number;
};

export type AdminUserRow = {
  id: string;
  email: string | null;
  displayName: string | null;
  role: "student" | "content_admin" | "admin";
  suspendedAt: string | null;
  createdAt: string;
  xpTotal: number;
  rankLevel: number;
  streakDays: number;
  masteredCount: number;
  lastActiveOn: string | null;
  subStatus: string | null;
};

export type AdminUserDetail = {
  id: string;
  email: string | null;
  displayName: string | null;
  role: string;
  suspendedAt: string | null;
  createdAt: string;
  orgId: string | null;
  stats: {
    xpTotal: number;
    rankLevel: number;
    streakDays: number;
    masteredCount: number;
    lastActiveOn: string | null;
  };
  seals: number;
  badges: number;
  examSessions: number;
  examPassed: number;
  srsDue: number;
  srsTotal: number;
  subscription: Record<string, unknown> | null;
  recentXp: { delta: number; reason: string; created_at: string }[];
};

export type AlertSeverity = "info" | "warning" | "critical";

export type SystemAlert = {
  id: string;
  kind: string;
  severity: AlertSeverity;
  title: string;
  body: string | null;
  meta: Record<string, unknown>;
  occurrences: number;
  firstSeenAt: string;
  lastSeenAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
};

export type BudgetConfig = {
  monthlyUsd: number;
  dailyUsd: number;
  circuitOpen: boolean;
  updatedAt: string | null;
};

/** Page classique (offset) — l'admin veut pouvoir sauter à une page précise. */
export type OffsetPage<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};
