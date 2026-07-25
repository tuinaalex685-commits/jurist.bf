/** Contrats de l'espace personnel (dashboard « Poste de commandement »). */
export type DashboardUser = {
  displayName: string;
  rankLevel: number;
  rankName: string;
  nextRankName: string | null;
  xpIntoRank: number;
  xpForNextRank: number | null;
  xpTotal: number;
  streakDays: number;
  masteredCount: number;
};

export type DashboardResume = {
  articleId: string;
  number: string;
  notion: string;
  phaseIndex: number;
  phaseName: string;
  progress: number; // 0..1 (phases complétées / total)
} | null;

export type DashboardCode = {
  id: string;
  name: string;
  mastered: number;
  total: number;
} | null;

export type DashboardSeal = {
  id: string;
  articleNumber: string;
  title: string | null;
};

export type DashboardData = {
  user: DashboardUser;
  resume: DashboardResume;
  code: DashboardCode;
  seals: DashboardSeal[];
  weaknesses: string[];
  strengths: string[];
  revisions: { today: number; tomorrow: number; week: number };
  unlock: { name: string; remaining: number } | null;
};
