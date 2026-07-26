import { withRoute } from "@/server/core/http/withRoute";
import { requireRole } from "@/server/modules/auth/session";
import { UpdateUserInput } from "@/server/modules/admin/dto";
import { getUserDetail, updateUser } from "@/server/modules/admin/service";
import { AppError } from "@/server/core/errors";

export const dynamic = "force-dynamic";

type Segment = { params: Promise<{ userId: string }> };

/** GET /api/v1/admin/users/:userId — fiche 360° (stats, sceaux, examens, SRS, abonnement). */
export const GET = withRoute<Segment>(async (_req, _ctx, { params }) => {
  await requireRole("admin");
  const { userId } = await params;
  return { data: await getUserDetail(userId) };
});

/** PATCH /api/v1/admin/users/:userId — rôle et/ou suspension (audité, garde-fous anti-verrouillage). */
export const PATCH = withRoute<Segment>(async (req, _ctx, { params }) => {
  const actor = await requireRole("admin");
  const { userId } = await params;

  const raw = await req.json().catch(() => null);
  const parsed = UpdateUserInput.safeParse(raw);
  if (!parsed.success) throw AppError.validation("Entrée invalide", parsed.error.issues);

  await updateUser(userId, parsed.data, actor);
  return { data: await getUserDetail(userId) };
});
