import { withRoute } from "@/server/core/http/withRoute";
import { isConfigured } from "@/server/core/config/env";

// Toujours dynamique : reflète l'état runtime des intégrations.
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/health — sonde de santé du socle.
 * Prouve l'architecture (withRoute → enveloppe standard) et expose l'état de configuration
 * des intégrations (sans jamais s'y connecter ni exposer de secret).
 */
export const GET = withRoute(async () => ({
  data: {
    status: "ok" as const,
    time: new Date().toISOString(),
    services: {
      supabase: isConfigured.supabase(),
      supabaseAdmin: isConfigured.supabaseAdmin(),
      redis: isConfigured.redis(),
      gemini: isConfigured.gemini(),
    },
  },
}));
