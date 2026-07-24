import "server-only";
import { createSupabaseServerClient } from "@/server/core/db/server";
import { AppError } from "@/server/core/errors";

export type UserRole = "student" | "content_admin" | "admin";

export interface SessionUser {
  id: string;
  email: string | null;
  role: UserRole;
}

const LEVEL: Record<UserRole, number> = { student: 1, content_admin: 2, admin: 3 };

/** Utilisateur de la session courante (ou null). Lit le rôle depuis `profiles` (RLS: self). */
export async function getSessionUser(): Promise<SessionUser | null> {
  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).single();
  const role = (profile?.role ?? "student") as UserRole;
  return { id: user.id, email: user.email ?? null, role };
}

/** Exige une session ; sinon 401. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw AppError.unauthenticated();
  return user;
}

/** Exige un rôle minimum (content_admin | admin) ; sinon 403. */
export async function requireRole(min: Exclude<UserRole, "student">): Promise<SessionUser> {
  const user = await requireUser();
  if (LEVEL[user.role] < LEVEL[min]) throw AppError.forbidden();
  return user;
}
