import "server-only";
import { getSupabaseAdmin } from "../db/admin";
import { AppError } from "../errors";

export interface PromptTemplate {
  id: string;
  key: string;
  version: number;
  body: string;
  model: string;
  params: Record<string, unknown>;
}

/**
 * Résout le Prompt Maître actif — SEUL point du backend qui lit `prompt_templates`.
 * Jamais de prompt codé en dur ailleurs. Changer le prompt = nouvelle version ici,
 * ce qui change automatiquement l'input_hash (⇒ régénération contrôlée).
 */
export async function getActivePrompt(key = "master"): Promise<PromptTemplate> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("prompt_templates")
    .select("id,key,version,body,model,params")
    .eq("key", key)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw AppError.dependency("Lecture du Prompt Maître échouée", error);
  if (!data) throw AppError.config(`Aucun prompt actif pour la clé "${key}"`);
  return {
    id: data.id,
    key: data.key,
    version: data.version,
    body: data.body,
    model: data.model ?? "gemini-2.0-flash",
    params: (data.params ?? {}) as Record<string, unknown>,
  };
}

/** Compose le prompt final en substituant les variables `{{var}}`. */
export function composePrompt(template: PromptTemplate, vars: Record<string, string>): string {
  return template.body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}
