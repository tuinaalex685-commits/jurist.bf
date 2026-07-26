import { withRoute } from "@/server/core/http/withRoute";
import { requireRole } from "@/server/modules/auth/session";
import { UploadUrlInput } from "@/server/modules/ai/dto";
import { getUploadUrl } from "@/server/modules/ai/service";
import { AppError } from "@/server/core/errors";

export const dynamic = "force-dynamic";

/** GET /api/v1/admin/documents/upload-url?filename=… — URL signée d'import (Storage privé). */
export const GET = withRoute(async (req) => {
  await requireRole("content_admin");
  const parsed = UploadUrlInput.safeParse({ filename: new URL(req.url).searchParams.get("filename") });
  if (!parsed.success) throw AppError.validation("Nom de fichier requis", parsed.error.issues);
  return { data: await getUploadUrl(parsed.data.filename) };
});
