import "server-only";
import { logger } from "@/server/core/logging/logger";
import * as repo from "./repository";

/**
 * Moniteur de santé — exécuté à chaque passage du worker.
 *
 * Principe : chaque règle possède une EMPREINTE stable. Tant que la cause dure,
 * l'alerte existante s'incrémente (une ligne, N occurrences). Dès que la cause
 * disparaît, l'alerte est close automatiquement — un cockpit qui reste rouge
 * après correction ne veut plus rien dire.
 */

/** Au-delà, une file non vide signifie que plus personne ne la traite. */
const STALLED_QUEUE_S = 15 * 60;
/** Fraction du plafond à partir de laquelle on prévient avant blocage. */
const BUDGET_WARN_RATIO = 0.8;

export interface HealthReport {
  raised: string[];
  resolved: string[];
}

export async function evaluateSystemHealth(): Promise<HealthReport> {
  const raised: string[] = [];
  const resolved: string[] = [];

  const [jobs, ai] = await Promise.all([repo.fetchJobsHealth(), repo.fetchAiUsageSummary()]);

  const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

  // --- Règle 1 : jobs définitivement abandonnés -----------------------------
  const dead = num(jobs.dead);
  if (dead > 0) {
    await repo.raiseAlert({
      kind: "jobs_dead",
      severity: "critical",
      title: `${dead} job(s) abandonné(s) dans la file`,
      body: "Ces jobs ont épuisé leurs tentatives. Ils ne repartiront pas seuls : relancez-les depuis la file après avoir corrigé la cause.",
      meta: { dead },
      fingerprint: "jobs_dead",
    });
    raised.push("jobs_dead");
  } else {
    if (await repo.resolveAlertsByFingerprint("jobs_dead")) resolved.push("jobs_dead");
  }

  // --- Règle 2 : worker à l'arrêt ------------------------------------------
  const oldest = num(jobs.oldestPendingAgeS);
  if (oldest > STALLED_QUEUE_S) {
    await repo.raiseAlert({
      kind: "worker_stalled",
      severity: "critical",
      title: "La file n'avance plus",
      body: `Le plus ancien job exigible attend depuis ${Math.round(oldest / 60)} minutes. Vérifiez que le cron appelle bien /api/internal/worker et que WORKER_SECRET correspond.`,
      meta: { oldestPendingAgeS: oldest },
      fingerprint: "worker_stalled",
    });
    raised.push("worker_stalled");
  } else {
    if (await repo.resolveAlertsByFingerprint("worker_stalled")) resolved.push("worker_stalled");
  }

  // --- Règle 3 : budget IA --------------------------------------------------
  const monthCost = num(ai.monthCostUsd);
  const monthLimit = num(ai.monthlyLimitUsd);
  const dayCost = num(ai.todayCostUsd);
  const dayLimit = num(ai.dailyLimitUsd);

  const monthRatio = monthLimit > 0 ? monthCost / monthLimit : 0;
  const dayRatio = dayLimit > 0 ? dayCost / dayLimit : 0;
  const worstRatio = Math.max(monthRatio, dayRatio);

  if (worstRatio >= 1) {
    await repo.raiseAlert({
      kind: "ai_budget",
      severity: "critical",
      title: "Plafond de budget IA atteint",
      body: `Consommé : ${dayCost.toFixed(2)} $ aujourd'hui (plafond ${dayLimit} $), ${monthCost.toFixed(2)} $ ce mois (plafond ${monthLimit} $). Les générations sont refusées jusqu'au relèvement du plafond.`,
      meta: { dayCost, dayLimit, monthCost, monthLimit },
      fingerprint: "ai_budget",
    });
    raised.push("ai_budget");
  } else if (worstRatio >= BUDGET_WARN_RATIO) {
    await repo.raiseAlert({
      kind: "ai_budget",
      severity: "warning",
      title: "Budget IA proche du plafond",
      body: `${Math.round(worstRatio * 100)} % du plafond consommé. Au-delà de 100 %, toute génération sera bloquée.`,
      meta: { dayCost, dayLimit, monthCost, monthLimit },
      fingerprint: "ai_budget",
    });
    raised.push("ai_budget");
  } else {
    if (await repo.resolveAlertsByFingerprint("ai_budget")) resolved.push("ai_budget");
  }

  // --- Règle 4 : coupe-circuit resté ouvert ---------------------------------
  // Signalé en continu : un circuit oublié en position ouverte gèle la fabrique
  // de contenu sans que personne ne s'en aperçoive.
  if (ai.circuitOpen) {
    await repo.raiseAlert({
      kind: "circuit_open",
      severity: "warning",
      title: "Coupe-circuit IA ouvert",
      body: "Toute génération est suspendue. Si ce n'est plus voulu, refermez-le depuis la page Génération IA.",
      fingerprint: "circuit_open",
    });
    raised.push("circuit_open");
  } else {
    if (await repo.resolveAlertsByFingerprint("circuit_open")) resolved.push("circuit_open");
  }

  if (raised.length || resolved.length) {
    logger.info("system_health_evaluated", { raised, resolved });
  }
  return { raised, resolved };
}
