import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env";
import { AppError } from "../errors";

/**
 * Client Supabase à privilèges élevés (service role) — **contourne la RLS**.
 * Réservé aux workers / tâches admin serveur. JAMAIS exposé au client.
 */
let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw AppError.config("Supabase admin (service role) non configuré");
  }
  cached ??= createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
