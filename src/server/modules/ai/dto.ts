import { z } from "zod";

export const CreatePromptInput = z.object({
  key: z.string().min(1).default("master"),
  body: z.string().min(10),
  model: z.string().min(1).default("gemini-2.0-flash"),
  params: z.record(z.string(), z.unknown()).optional(),
  activate: z.boolean().optional().default(false),
});
export type CreatePromptInput = z.infer<typeof CreatePromptInput>;

export const GenerateRequestInput = z.object({
  scope: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("article"), articleId: z.string().uuid() }),
    z.object({ kind: z.literal("code"), codeId: z.string().uuid() }),
  ]),
});
export type GenerateRequestInput = z.infer<typeof GenerateRequestInput>;

export const CreateDocumentInput = z.object({
  filename: z.string().min(1),
  mime: z.string().min(1),
  storagePath: z.string().min(1),
  checksum: z.string().min(1),
  codeId: z.string().uuid().optional(),
});
export type CreateDocumentInput = z.infer<typeof CreateDocumentInput>;

export const UploadUrlInput = z.object({
  filename: z.string().min(1),
});
export type UploadUrlInput = z.infer<typeof UploadUrlInput>;
