import { z } from "zod";

export const StartExamInput = z.object({
  idempotencyKey: z.string().min(8).max(128).optional(),
});
export type StartExamInput = z.infer<typeof StartExamInput>;

export const AnswerInput = z.object({
  questionId: z.string().uuid(),
  answer: z.unknown(),
});
export type AnswerInput = z.infer<typeof AnswerInput>;
