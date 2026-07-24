import "server-only";
import { AppError } from "@/server/core/errors";
import { callRedeemAccessCode } from "./repository";
import type { RedeemCodeResult } from "./dto";

/**
 * Règle métier : rédemption d'un code d'accès (idempotente).
 * - code déjà rédimé par le même utilisateur → `already` (pas d'erreur).
 * - code inexistant → 404 ; déjà pris par un autre / révoqué / expiré → 409.
 */
export async function redeemAccessCode(code: string): Promise<RedeemCodeResult> {
  const { data, error } = await callRedeemAccessCode(code);

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("INVALID_CODE")) throw AppError.notFound("Code d'accès invalide");
    if (msg.includes("CODE_UNAVAILABLE")) throw AppError.conflict("Code déjà utilisé, révoqué ou expiré");
    if (msg.includes("UNAUTHENTICATED")) throw AppError.unauthenticated();
    throw AppError.internal("Échec de la rédemption du code", error);
  }

  const payload = (data ?? {}) as { status?: string; batch_id?: string | null };
  return {
    status: payload.status === "already" ? "already" : "redeemed",
    batchId: payload.batch_id ?? null,
  };
}
