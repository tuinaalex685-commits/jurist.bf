import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "../config/env";
import { AppError } from "../errors";

/**
 * Client Supabase côté serveur, lié à la session utilisateur (cookies).
 * Respecte la RLS avec l'identité de l'appelant. Passe par le **pooler** (chaîne pooled).
 */
export async function createSupabaseServerClient() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw AppError.config("Supabase (serveur) non configuré");
  }
  const cookieStore = await cookies();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Appelé depuis un Server Component (cookies immuables) : la session est
          // rafraîchie par le middleware. Ignoré volontairement.
        }
      },
    },
  });
}
