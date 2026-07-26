import "server-only";
import { getSupabaseAdmin } from "@/server/core/db/admin";
import { AppError } from "@/server/core/errors";
import type { GenerationBundle } from "./bundleSchema";

const admin = () => getSupabaseAdmin();

// ---------------------------------------------------------------------------
// Prompt Maître
// ---------------------------------------------------------------------------
export async function listPrompts(key: string) {
  const { data, error } = await admin()
    .from("prompt_templates")
    .select("id,key,version,body,model,is_active,created_at")
    .eq("key", key)
    .order("version", { ascending: false });
  if (error) throw AppError.dependency("Lecture des prompts échouée", error);
  return data ?? [];
}

export async function createPromptVersion(input: {
  key: string; body: string; model: string; params?: Record<string, unknown>; createdBy: string;
}) {
  const { data: last } = await admin().from("prompt_templates").select("version").eq("key", input.key).order("version", { ascending: false }).limit(1).maybeSingle();
  const nextVersion = (last?.version ?? 0) + 1;
  const { data, error } = await admin()
    .from("prompt_templates")
    .insert({ key: input.key, version: nextVersion, body: input.body, model: input.model, params: input.params ?? {}, created_by: input.createdBy })
    .select("id,version")
    .single();
  if (error) throw AppError.dependency("Création du prompt échouée", error);
  return data;
}

export async function activatePrompt(id: string, key: string) {
  const sb = admin();
  const { error: e1 } = await sb.from("prompt_templates").update({ is_active: false }).eq("key", key).eq("is_active", true);
  if (e1) throw AppError.dependency("Désactivation de l'ancien prompt échouée", e1);
  const { error: e2 } = await sb.from("prompt_templates").update({ is_active: true }).eq("id", id);
  if (e2) throw AppError.dependency("Activation du prompt échouée", e2);
}

// ---------------------------------------------------------------------------
// Documents sources
// ---------------------------------------------------------------------------
export async function listDocuments() {
  const { data, error } = await admin().from("source_documents").select("id,filename,mime,status,created_at").order("created_at", { ascending: false }).limit(50);
  if (error) throw AppError.dependency("Lecture des documents échouée", error);
  return data ?? [];
}

export async function createDocument(input: { filename: string; mime: string; storagePath: string; checksum: string; codeId?: string; uploadedBy: string }) {
  const { data, error } = await admin()
    .from("source_documents")
    .insert({ filename: input.filename, mime: input.mime, storage_path: input.storagePath, checksum: input.checksum, code_id: input.codeId ?? null, uploaded_by: input.uploadedBy })
    .select("id")
    .single();
  if (error) throw AppError.dependency("Enregistrement du document échoué", error);
  return data;
}

export async function createUploadUrl(filename: string) {
  const path = `${Date.now()}-${filename.replace(/[^\w.\-]/g, "_")}`;
  const { data, error } = await admin().storage.from("source-documents").createSignedUploadUrl(path);
  if (error) throw AppError.dependency("Création de l'URL d'import échouée", error);
  return { path, token: data.token, signedUrl: data.signedUrl };
}

// ---------------------------------------------------------------------------
// Articles à générer
// ---------------------------------------------------------------------------
export async function getGenerationTarget(articleId: string) {
  const { data: art, error } = await admin()
    .from("articles")
    .select("id,number,title,code_id,current_version_id")
    .eq("id", articleId)
    .maybeSingle();
  if (error) throw AppError.dependency("Lecture de l'article échouée", error);
  if (!art) throw AppError.notFound("Article introuvable");

  let versionId = art.current_version_id as string | null;
  if (!versionId) {
    const { data: v } = await admin().from("article_versions").select("id").eq("article_id", articleId).order("version_no", { ascending: false }).limit(1).maybeSingle();
    versionId = v?.id ?? null;
  }
  if (!versionId) throw AppError.conflict("Aucune version de contenu pour cet article (importez le texte officiel d'abord)");

  const { data: version } = await admin().from("article_versions").select("id,official_text,text_hash").eq("id", versionId).single();

  return {
    articleId: art.id,
    codeId: art.code_id as string,
    number: art.number as string,
    title: art.title as string | null,
    versionId,
    officialText: version!.official_text as string,
    textHash: version!.text_hash as string,
  };
}

export async function listArticleIdsForCode(codeId: string): Promise<string[]> {
  const { data, error } = await admin().from("articles").select("id").eq("code_id", codeId).is("archived_at", null);
  if (error) throw AppError.dependency("Lecture des articles du code échouée", error);
  return (data ?? []).map((a) => a.id);
}

// ---------------------------------------------------------------------------
// Lots de génération (suivi cockpit)
// ---------------------------------------------------------------------------
export async function createBatch(scope: Record<string, unknown>, requestedBy: string, total: number) {
  const { data, error } = await admin().from("generation_batches").insert({ scope, requested_by: requestedBy, total }).select("id").single();
  if (error) throw AppError.dependency("Création du lot échouée", error);
  return data.id as string;
}

/** Lecture-incrément-écriture : admin-only, très faible contention (1 worker/lot en pratique). */
export async function bumpBatch(batchId: string, field: "done" | "failed") {
  const { data } = await admin().from("generation_batches").select(field).eq("id", batchId).single();
  const current = (data as Record<string, number> | null)?.[field] ?? 0;
  await admin().from("generation_batches").update({ [field]: current + 1 }).eq("id", batchId);
}

export async function finalizeBatch(batchId: string) {
  const { data } = await admin().from("generation_batches").select("total,done,failed").eq("id", batchId).single();
  if (!data) return;
  if (data.done + data.failed >= data.total) {
    await admin().from("generation_batches").update({ status: data.failed > 0 && data.done === 0 ? "failed" : "done" }).eq("id", batchId);
  }
}

export async function getBatch(id: string) {
  const { data, error } = await admin().from("generation_batches").select("*").eq("id", id).maybeSingle();
  if (error) throw AppError.dependency("Lecture du lot échouée", error);
  if (!data) throw AppError.notFound("Lot introuvable");
  return data;
}

export async function listBatches(limit = 20) {
  const { data, error } = await admin().from("generation_batches").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) throw AppError.dependency("Lecture des lots échouée", error);
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Cache de génération (dédup) + usage
// ---------------------------------------------------------------------------
export async function findGenerationByHash(inputHash: string) {
  const { data } = await admin().from("ai_generations").select("*").eq("input_hash", inputHash).maybeSingle();
  return data;
}

export async function recordGeneration(row: {
  contentType: string; sourceVersionId: string; promptVersion: number; inputHash: string;
  model: string; output: unknown; tokensIn: number; tokensOut: number; costUsd: number;
}) {
  const { error } = await admin().from("ai_generations").insert({
    content_type: row.contentType, source_version_id: row.sourceVersionId, prompt_version: row.promptVersion,
    input_hash: row.inputHash, model: row.model, output: row.output, tokens_in: row.tokensIn, tokens_out: row.tokensOut, cost_usd: row.costUsd,
  });
  // Course bénigne : un autre worker a inséré la même clé entre-temps — on ignore, la ligne existe déjà.
  if (error && !/duplicate key/i.test(error.message)) throw AppError.dependency("Enregistrement de la génération échoué", error);
  return findGenerationByHash(row.inputHash);
}

export async function recordUsage(row: { feature: string; codeId: string; tokensIn: number; tokensOut: number; costUsd: number; cacheHit: boolean }) {
  await admin().from("ai_usage").insert({ feature: row.feature, code_id: row.codeId, tokens_in: row.tokensIn, tokens_out: row.tokensOut, cost_usd: row.costUsd, cache_hit: row.cacheHit });
}

/**
 * Synthèse d'usage IA — un seul aller-retour, tout agrégé en SQL (migration 0016).
 * Remplace les 5 requêtes + sommes côté Node de la version B7, qui balayaient
 * `ai_usage` en entier à chaque affichage du cockpit.
 */
export async function getUsageSummary() {
  const { data, error } = await admin().rpc("admin_ai_usage_summary");
  if (error) throw AppError.dependency("Lecture de la consommation IA échouée", error);
  const raw = (data ?? {}) as Record<string, unknown>;
  const num = (v: unknown, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);

  return {
    todayCostUsd: num(raw.todayCostUsd),
    monthCostUsd: num(raw.monthCostUsd),
    dailyLimitUsd: num(raw.dailyLimitUsd, 5),
    monthlyLimitUsd: num(raw.monthlyLimitUsd, 50),
    circuitOpen: Boolean(raw.circuitOpen),
    totalGenerations: num(raw.totalGenerations),
    cacheHitRate: num(raw.cacheHitRate),
  };
}

// ---------------------------------------------------------------------------
// Écriture du contenu généré (draft) — ne touche jamais validated/published.
// ---------------------------------------------------------------------------
export async function replaceDraftContent(articleVersionId: string, bundle: GenerationBundle) {
  const sb = admin();

  await sb.from("activities").delete().eq("article_version_id", articleVersionId).eq("status", "draft");
  await sb.from("exam_questions_bank").delete().eq("article_version_id", articleVersionId).eq("status", "draft");

  let activitiesCount = 0;
  for (const [i, a] of bundle.activities.entries()) {
    const { data: inserted, error } = await sb
      .from("activities")
      .insert({ article_version_id: articleVersionId, phase: a.phase, position: i, type: a.type, objective: a.objective ?? null, difficulty: a.difficulty ?? null, weight: a.weight ?? 1, prompt: a.prompt, status: "draft" })
      .select("id")
      .single();
    if (error) throw AppError.dependency("Écriture d'une activité échouée", error);
    activitiesCount++;
    if (a.solution || a.evaluation || a.feedback) {
      await sb.from("activity_solutions").insert({ activity_id: inserted.id, solution: a.solution ?? {}, evaluation: a.evaluation ?? {}, feedback: a.feedback ?? {} });
    }
  }

  let examQuestionsCount = 0;
  for (const q of bundle.examQuestions) {
    const { error } = await sb.from("exam_questions_bank").insert({ article_version_id: articleVersionId, type: q.type, payload: q.payload, difficulty: q.difficulty ?? null, status: "draft" });
    if (error) throw AppError.dependency("Écriture d'une question d'examen échouée", error);
    examQuestionsCount++;
  }

  return { activitiesCount, examQuestionsCount };
}

// ---------------------------------------------------------------------------
// File (jobs) — monitoring & reprise
// ---------------------------------------------------------------------------
export async function listJobs(type: string, limit = 30) {
  const { data, error } = await admin().from("jobs").select("id,type,status,attempts,max_attempts,last_error,created_at,updated_at").eq("type", type).order("created_at", { ascending: false }).limit(limit);
  if (error) throw AppError.dependency("Lecture des jobs échouée", error);
  return data ?? [];
}

export interface ClaimedJob { id: string; type: string; payload: Record<string, unknown>; attempts: number }

/** Réclamation atomique (FOR UPDATE SKIP LOCKED côté SQL) — service_role only. */
export async function claimJobs(types: string[], limit = 5): Promise<ClaimedJob[]> {
  const { data, error } = await admin().rpc("claim_jobs", { p_types: types, p_limit: limit });
  if (error) throw AppError.dependency("Réclamation des jobs échouée", error);
  return (data ?? []) as ClaimedJob[];
}

export async function completeJob(jobId: string, result?: unknown) {
  const { error } = await admin().rpc("complete_job", { p_job_id: jobId, p_result: result ?? null });
  if (error) throw AppError.dependency("Clôture du job échouée", error);
}

export async function failJob(jobId: string, errorMessage: string) {
  const { error } = await admin().rpc("fail_job", { p_job_id: jobId, p_error: errorMessage.slice(0, 2000) });
  if (error) throw AppError.dependency("Échec du job non enregistré", error);
}

export async function retryJob(id: string) {
  const { data: job } = await admin().from("jobs").select("status").eq("id", id).maybeSingle();
  if (!job) throw AppError.notFound("Job introuvable");
  if (!["error", "dead"].includes(job.status)) throw AppError.conflict("Seul un job en erreur peut être relancé");
  const { error } = await admin().from("jobs").update({ status: "pending", attempts: 0, last_error: null, run_after: new Date().toISOString() }).eq("id", id);
  if (error) throw AppError.dependency("Relance du job échouée", error);
}
