import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase navigateur (anon + RLS). Lit uniquement les variables NEXT_PUBLIC_*
 * (inlinées au build). À utiliser dans les Client Components si un accès direct est requis ;
 * la logique métier passe par l'API.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
