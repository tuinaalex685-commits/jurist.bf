/** Contrats du Content Studio (admin-only). */
export type PromptTemplateDTO = {
  id: string;
  key: string;
  version: number;
  body: string;
  model: string;
  isActive: boolean;
  createdAt: string;
};

export type GenerationBatch = {
  id: string;
  scope: Record<string, unknown>;
  total: number;
  done: number;
  failed: number;
  status: "running" | "done" | "failed";
  createdAt: string;
};

export type GenerationResult = {
  cacheHit: boolean;
  activitiesCount: number;
  examQuestionsCount: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
};

export type AiUsageSummary = {
  todayCostUsd: number;
  monthCostUsd: number;
  dailyLimitUsd: number;
  monthlyLimitUsd: number;
  circuitOpen: boolean;
  totalGenerations: number;
  cacheHitRate: number;
};

export type JobRecord = {
  id: string;
  type: string;
  status: "pending" | "running" | "done" | "error" | "dead";
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SourceDocument = {
  id: string;
  filename: string;
  mime: string;
  status: "uploaded" | "parsing" | "parsed" | "failed";
  createdAt: string;
};
