import { withRoute } from "@/server/core/http/withRoute";
import { requireRole } from "@/server/modules/auth/session";
import { CreatePromptInput } from "@/server/modules/ai/dto";
import { listPrompts, createPrompt } from "@/server/modules/ai/service";
import { AppError } from "@/server/core/errors";

export const dynamic = "force-dynamic";

/** GET /api/v1/admin/prompts — historique des versions du Prompt Maître. */
export const GET = withRoute(async (req) => {
  await requireRole("content_admin");
  const key = new URL(req.url).searchParams.get("key") ?? "master";
  return { data: await listPrompts(key) };
});

/** POST /api/v1/admin/prompts — nouvelle version (optionnellement activée). */
export const POST = withRoute(async (req) => {
  const user = await requireRole("content_admin");
  const raw = await req.json().catch(() => null);
  const parsed = CreatePromptInput.safeParse(raw);
  if (!parsed.success) throw AppError.validation("Entrée invalide", parsed.error.issues);
  return { data: await createPrompt(parsed.data, user.id) };
});
