import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "@/server/modules/auth/session";

/**
 * Garde de PAGE (à distinguer de `requireRole`, garde d'API qui lève une
 * AppError → 403). Dans une page, un 403 brut n'a pas de sens : on redirige.
 */
export async function requireAdminPage(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/cockpit/ia");
  return user;
}

export async function requireContentAdminPage(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "student") redirect("/");
  return user;
}
