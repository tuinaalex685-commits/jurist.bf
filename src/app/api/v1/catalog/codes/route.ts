import { withRoute } from "@/server/core/http/withRoute";
import { requireUser } from "@/server/modules/auth/session";
import { getCodes } from "@/server/modules/catalog/service";

export const dynamic = "force-dynamic";

/** GET /api/v1/catalog/codes — liste des codes (avec pays + nb d'articles). */
export const GET = withRoute(async () => {
  await requireUser();
  return { data: await getCodes() };
});
