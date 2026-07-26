import { z } from "zod";
import { uuid } from "@/server/core/validation";

export const StartExamInput = z.object({
  idempotencyKey: z.string().min(8).max(128).optional(),
});
export type StartExamInput = z.infer<typeof StartExamInput>;

export const AnswerInput = z.object({
  questionId: uuid(),
  answer: z.unknown(),
});
export type AnswerInput = z.infer<typeof AnswerInput>;
