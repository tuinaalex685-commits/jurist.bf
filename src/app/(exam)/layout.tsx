import { redirect } from "next/navigation";
import Link from "next/link";
import { X } from "lucide-react";
import { getSessionUser } from "@/server/modules/auth/session";

/**
 * Groupe « Épreuve » : mode focus total (aucune sidebar/header). L'utilisateur
 * doit se sentir dans une salle d'examen, pas dans l'application courante.
 * Garde d'authentification (défense en profondeur, en plus de la RLS).
 */
export default async function ExamGroupLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-16 items-center justify-between border-b border-border px-6">
        <span className="font-display text-lg font-semibold">Jurist<span className="text-primary"> BF</span></span>
        <Link href="/" aria-label="Quitter l'examen" className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
          <X className="h-4 w-4" />
        </Link>
      </header>
      <main className="px-6 py-10">{children}</main>
    </div>
  );
}
