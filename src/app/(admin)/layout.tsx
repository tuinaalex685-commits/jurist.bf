import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/modules/auth/session";
import { CockpitShell } from "@/components/admin/cockpit-shell";

/**
 * Groupe cockpit. Garde de RÔLE côté serveur : `content_admin` au minimum.
 * Un étudiant authentifié est renvoyé à l'accueil (pas vers /login : il a bien
 * une session, il n'a simplement rien à faire ici). Défense en profondeur —
 * chaque route API revérifie le rôle, et la RLS protège la base par ailleurs.
 */
export default async function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "student") redirect("/");

  return <CockpitShell user={user}>{children}</CockpitShell>;
}
