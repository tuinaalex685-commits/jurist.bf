import "server-only";
import { getSupabaseAdmin } from "../db/admin";
import { AppError } from "../errors";

export interface BudgetStatus {
  dailySpent: number;
  monthlySpent: number;
  dailyLimit: number;
  monthlyLimit: number;
  circuitOpen: boolean;
  blocked: boolean;
}

/**
 * Vérifie le budget IA avant tout appel modèle. Coupe-circuit automatique :
 * si dépassé (ou explicitement ouvert par un admin), la génération est bloquée
 * AVANT tout appel réseau — jamais après.
 */
export async function checkBudget(): Promise<BudgetStatus> {
  const admin = getSupabaseAdmin();

  const { data: config } = await admin
    .from("ai_budget_config")
    .select("monthly_usd,daily_usd,circuit_open")
    .eq("id", 1)
    .maybeSingle();
  const dailyLimit = config?.daily_usd ?? 5;
  const monthlyLimit = config?.monthly_usd ?? 50;
  const circuitOpen = config?.circuit_open ?? false;

  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);

  // Somme calculée EN SQL (migration 0016) : `ai_usage` croît sans borne, la
  // ramener côté Node pour la sommer ne tiendrait pas la charge.
  const sumSince = async (iso: string) => {
    const { data, error } = await admin.rpc("ai_cost_since", { p_since: iso });
    if (error) throw AppError.dependency("Lecture du coût IA échouée", error);
    return Number(data ?? 0);
  };

  const [dailySpent, monthlySpent] = await Promise.all([sumSince(startOfDay.toISOString()), sumSince(startOfMonth.toISOString())]);

  const blocked = circuitOpen || dailySpent >= dailyLimit || monthlySpent >= monthlyLimit;
  return { dailySpent, monthlySpent, dailyLimit, monthlyLimit, circuitOpen, blocked };
}

/** Lève une erreur métier si le budget est dépassé — à appeler avant tout appel provider. */
export async function assertBudgetAvailable(): Promise<void> {
  const status = await checkBudget();
  if (status.blocked) {
    throw new AppError("AI_BUDGET_EXCEEDED", "Budget IA atteint ou coupe-circuit actif", { details: status });
  }
}
