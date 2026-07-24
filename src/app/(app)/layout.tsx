import { redirect } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { getSessionUser } from "@/server/modules/auth/session";

/**
 * Groupe applicatif (« Halls »). Garde d'authentification : toute route ici
 * exige une session — sinon redirection vers /login. Sécurité côté serveur,
 * en complément de la RLS (défense en profondeur).
 */
export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <AppLayout>{children}</AppLayout>;
}
