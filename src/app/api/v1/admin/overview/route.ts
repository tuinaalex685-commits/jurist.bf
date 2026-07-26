import { withRoute } from "@/server/core/http/withRoute";
import { requireRole } from "@/server/modules/auth/session";
import { getOverview } from "@/server/modules/admin/service";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/overview — KPI de tête du cockpit (utilisateurs, revenus,
 * contenu, apprentissage, IA, file, alertes) en un seul aller-retour SQL.
 * Réservé `admin` : contient les données de revenus.
 */
export const GET = withRoute(async () => {
  await requireRole("admin");
  return { data: await getOverview() };
});
