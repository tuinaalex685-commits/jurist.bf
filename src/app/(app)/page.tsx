import { requireUser } from "@/server/modules/auth/session";
import { getDashboard } from "@/server/modules/me/service";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboard(user);
  return <DashboardView data={data} />;
}
