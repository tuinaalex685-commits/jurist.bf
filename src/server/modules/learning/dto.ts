import { z } from "zod";

/** Réponse d'une tentative — forme polymorphe selon le type d'activité (validée par la méthode d'éval). */
export const AttemptInput = z.object({
  response: z.unknown(),
});
export type AttemptInput = z.infer<typeof AttemptInput>;
