import { withRoute } from "@/server/core/http/withRoute";
import { requireUser } from "@/server/modules/auth/session";
import { getSession } from "@/server/modules/srs/service";

export const dynamic = "force-dynamic";

/** GET /api/v1/me/revisions/session — cartes dues aujourd'hui, groupées par état. */
export const GET = withRoute(async () => {
  await requireUser();
  return { data: await getSession() };
});
