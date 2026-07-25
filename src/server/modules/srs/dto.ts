import { z } from "zod";

/** Qualité de rappel (SM-2) : 0=oublié total … 5=parfait immédiat. */
export const GradeInput = z.object({
  grade: z.number().int().min(0).max(5),
});
export type GradeInput = z.infer<typeof GradeInput>;
