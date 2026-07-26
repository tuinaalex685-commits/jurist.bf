import { withRoute } from "@/server/core/http/withRoute";
import { requireRole } from "@/server/modules/auth/session";
import { ListUsersQuery } from "@/server/modules/admin/dto";
import { listUsers } from "@/server/modules/admin/service";
import { AppError } from "@/server/core/errors";

export const dynamic = "force-dynamic";

/** GET /api/v1/admin/users?search=&role=&limit=&offset= — annuaire paginé. */
export const GET = withRoute(async (req) => {
  await requireRole("admin");
  const sp = new URL(req.url).searchParams;
  const parsed = ListUsersQuery.safeParse({
    search: sp.get("search") ?? undefined,
    role: sp.get("role") ?? undefined,
    limit: sp.get("limit") ?? undefined,
    offset: sp.get("offset") ?? undefined,
  });
  if (!parsed.success) throw AppError.validation("Paramètres invalides", parsed.error.issues);

  const page = await listUsers(parsed.data);
  return { data: page.items, meta: { total: page.total, limit: page.limit, offset: page.offset } };
});
