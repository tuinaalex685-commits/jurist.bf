import { z } from "zod";

/**
 * Schéma défensif du bundle produit par le provider IA (mock ou réel).
 * Validé avant toute écriture en base — un modèle réel produit un JSON moins
 * prévisible qu'un mock ; on ne fait jamais confiance à sa sortie sans schéma.
 */
export const ActivityDraft = z.object({
  phase: z.number().int().min(0).max(4),
  type: z.string().min(1),
  objective: z.string().optional(),
  difficulty: z.string().optional(),
  weight: z.number().optional(),
  prompt: z.record(z.string(), z.unknown()),
  solution: z.record(z.string(), z.unknown()).optional(),
  evaluation: z.record(z.string(), z.unknown()).optional(),
  feedback: z.record(z.string(), z.unknown()).optional(),
});

export const ExamQuestionDraft = z.object({
  type: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
  difficulty: z.string().optional(),
});

export const GenerationBundle = z.object({
  activities: z.array(ActivityDraft).min(1),
  examQuestions: z.array(ExamQuestionDraft).optional().default([]),
});
export type GenerationBundle = z.infer<typeof GenerationBundle>;

export function parseBundle(rawText: string): GenerationBundle {
  let json: unknown;
  try {
    json = JSON.parse(rawText);
  } catch {
    throw new Error("Sortie IA non-JSON : impossible de parser le bundle");
  }
  const result = GenerationBundle.safeParse(json);
  if (!result.success) {
    throw new Error("Bundle IA invalide : " + result.error.issues.map((i) => i.message).join("; "));
  }
  return result.data;
}
