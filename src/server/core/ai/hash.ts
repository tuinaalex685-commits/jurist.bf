import { createHash } from "node:crypto";

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/**
 * Clé de déduplication d'une génération : déterministe par version d'article
 * + version de prompt + spécification. Identique en entrée ⇒ identique en sortie
 * ⇒ jamais deux fois le même appel IA (cache partagé par TOUS les étudiants).
 */
export function buildInputHash(params: {
  promptKey: string;
  promptVersion: number;
  textHash: string;
  contentType: string;
  params?: Record<string, unknown>;
}): string {
  const stable = JSON.stringify({
    promptKey: params.promptKey,
    promptVersion: params.promptVersion,
    textHash: params.textHash,
    contentType: params.contentType,
    params: params.params ?? {},
  });
  return sha256(stable);
}
