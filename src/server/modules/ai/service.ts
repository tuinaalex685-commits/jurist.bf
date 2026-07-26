import "server-only";
import { getQueue } from "@/server/core/queue/queue";
import { AppError } from "@/server/core/errors";
import * as repo from "./repository";
import type { GenerateRequestInput, CreatePromptInput, CreateDocumentInput } from "./dto";
import type { AiUsageSummary, GenerationBatch, JobRecord, PromptTemplateDTO, SourceDocument } from "@/server/contracts/ai";

export async function listPrompts(key = "master"): Promise<PromptTemplateDTO[]> {
  const rows = await repo.listPrompts(key);
  return rows.map((r) => ({ id: r.id, key: r.key, version: r.version, body: r.body, model: r.model, isActive: r.is_active, createdAt: r.created_at }));
}

export async function createPrompt(input: CreatePromptInput, createdBy: string) {
  const created = await repo.createPromptVersion({ key: input.key, body: input.body, model: input.model, params: input.params, createdBy });
  if (input.activate) await repo.activatePrompt(created.id, input.key);
  return { id: created.id, version: created.version, active: input.activate };
}

export async function activatePrompt(id: string, key = "master") {
  await repo.activatePrompt(id, key);
}

export async function listDocuments(): Promise<SourceDocument[]> {
  const rows = await repo.listDocuments();
  return rows.map((d) => ({ id: d.id, filename: d.filename, mime: d.mime, status: d.status, createdAt: d.created_at }));
}

export async function createDocument(input: CreateDocumentInput, uploadedBy: string) {
  return repo.createDocument({ ...input, uploadedBy });
}

export async function getUploadUrl(filename: string) {
  return repo.createUploadUrl(filename);
}

/** Déclenche une génération (portée article ou code) — enfile un job par article. Jamais synchrone. */
export async function requestGeneration(input: GenerateRequestInput, requestedBy: string): Promise<{ batchId: string; enqueued: number }> {
  const articleIds =
    input.scope.kind === "article" ? [input.scope.articleId] : await repo.listArticleIdsForCode(input.scope.codeId);

  if (articleIds.length === 0) throw AppError.notFound("Aucun article dans ce périmètre");

  const batchId = await repo.createBatch(input.scope, requestedBy, articleIds.length);
  const queue = getQueue();

  for (const articleId of articleIds) {
    await queue.enqueue({
      type: "ai.generate",
      payload: { articleId, requestedBy, batchId },
      idempotencyKey: `ai.generate:${articleId}:${batchId}`,
    });
  }

  return { batchId, enqueued: articleIds.length };
}

export async function getBatch(id: string): Promise<GenerationBatch> {
  const b = await repo.getBatch(id);
  return { id: b.id, scope: b.scope, total: b.total, done: b.done, failed: b.failed, status: b.status, createdAt: b.created_at };
}

export async function listBatches(): Promise<GenerationBatch[]> {
  const rows = await repo.listBatches();
  return rows.map((b) => ({ id: b.id, scope: b.scope, total: b.total, done: b.done, failed: b.failed, status: b.status, createdAt: b.created_at }));
}

export async function getUsageSummary(): Promise<AiUsageSummary> {
  return repo.getUsageSummary();
}

export async function listJobs(): Promise<JobRecord[]> {
  const rows = await repo.listJobs("ai.generate");
  return rows.map((j) => ({ id: j.id, type: j.type, status: j.status, attempts: j.attempts, maxAttempts: j.max_attempts, lastError: j.last_error, createdAt: j.created_at, updatedAt: j.updated_at }));
}

export async function retryJob(id: string) {
  await repo.retryJob(id);
}
