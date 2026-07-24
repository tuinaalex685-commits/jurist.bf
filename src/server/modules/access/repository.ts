import "server-only";
import { createSupabaseServerClient } from "@/server/core/db/server";

/**
 * Accès données du module `access`. La rédemption passe par une fonction SQL
 * SECURITY DEFINER (`redeem_access_code`) : atomique, RLS-safe, exécutée avec
 * l'identité de l'appelant (auth.uid()).
 */
export async function callRedeemAccessCode(code: string) {
  const sb = await createSupabaseServerClient();
  return sb.rpc("redeem_access_code", { p_code: code });
}
