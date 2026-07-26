import { withRoute } from "@/server/core/http/withRoute";
import { requireRole } from "@/server/modules/auth/session";
import { CreateDocumentInput } from "@/server/modules/ai/dto";
import { listDocuments, createDocument } from "@/server/modules/ai/service";
import { AppError } from "@/server/core/errors";

export const dynamic = "force-dynamic";

/** GET /api/v1/admin/documents — documents sources importés. */
export const GET = withRoute(async () => {
  await requireRole("content_admin");
  return { data: await listDocuments() };
});

/** POST /api/v1/admin/documents — enregistre un document déjà téléversé (voir upload-url). */
export const POST = withRoute(async (req) => {
  const user = await requireRole("content_admin");
  const raw = await req.json().catch(() => null);
  const parsed = CreateDocumentInput.safeParse(raw);
  if (!parsed.success) throw AppError.validation("Entrée invalide", parsed.error.issues);
  return { data: await createDocument(parsed.data, user.id) };
});
