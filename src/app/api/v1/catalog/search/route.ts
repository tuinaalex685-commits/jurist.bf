import { withRoute } from "@/server/core/http/withRoute";
import { requireUser } from "@/server/modules/auth/session";
import { searchArticles } from "@/server/modules/catalog/service";
import { SearchQuery } from "@/server/modules/catalog/dto";
import { AppError } from "@/server/core/errors";

export const dynamic = "force-dynamic";

/** GET /api/v1/catalog/search?q= — recherche d'articles (numéro/titre, pg_trgm). */
export const GET = withRoute(async (req) => {
  await requireUser();
  const url = new URL(req.url);
  const parsed = SearchQuery.safeParse({ q: url.searchParams.get("q") ?? "" });
  if (!parsed.success) throw AppError.validation("Requête invalide", parsed.error.issues);
  return { data: await searchArticles(parsed.data.q) };
});
