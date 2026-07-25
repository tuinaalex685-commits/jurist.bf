import type { Metadata } from "next";
import { getSession } from "@/server/modules/srs/service";
import { RevisionsView } from "@/components/revisions/revisions-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Révisions" };

export default async function RevisionsPage() {
  const session = await getSession();
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-widest text-cat-amber">Révision espacée</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Votre séance</h1>
        <p className="mt-2 text-muted-foreground">La répétition espacée garantit que vous n&apos;oublierez jamais ce que vous avez appris.</p>
      </header>
      <RevisionsView session={session} />
    </div>
  );
}
