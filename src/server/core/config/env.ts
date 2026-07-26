import "server-only";
import { z } from "zod";

/**
 * Validation d'environnement (Zod), tolérante : les intégrations non configurées
 * (Supabase, Upstash, Gemini) ne font pas planter le build — on expose `isConfigured`
 * pour dégrader proprement. Fichier **server-only** : jamais importé côté client.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // Upstash (cache + rate limit)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  // IA (Gemini) — jamais appelée sans budget/coupe-circuit
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().default("gemini-2.0-flash"),
  AI_MONTHLY_BUDGET_USD: z.coerce.number().nonnegative().default(50),
  AI_DAILY_BUDGET_USD: z.coerce.number().nonnegative().default(5),

  // Worker asynchrone (protège /api/internal/worker)
  WORKER_SECRET: z.string().min(1).optional(),
  // Vercel Cron : si cette variable est définie, Vercel envoie
  // `Authorization: Bearer <CRON_SECRET>` sur chaque déclenchement planifié.
  CRON_SECRET: z.string().min(1).optional(),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  // Normalise "" → undefined (les .env vides ne doivent pas casser la validation d'URL).
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(process.env)) cleaned[k] = v === "" ? undefined : v;

  const parsed = EnvSchema.safeParse(cleaned);
  if (!parsed.success) {
    throw new Error(
      `Configuration d'environnement invalide :\n${parsed.error.issues
        .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
        .join("\n")}`,
    );
  }
  return parsed.data;
}

export const env = loadEnv();

/** Chaque intégration est-elle prête à être utilisée ? (dégradation gracieuse) */
export const isConfigured = {
  supabase: () => Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  supabaseAdmin: () => Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
  redis: () => Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN),
  gemini: () => Boolean(env.GEMINI_API_KEY),
} as const;
