import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookMarked, Library as LibraryIcon } from "lucide-react";
import { getCodes } from "@/server/modules/catalog/service";

export const metadata: Metadata = { title: "Bibliothèque" };

export default async function LibraryPage() {
  const codes = await getCodes();

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-bold uppercase tracking-widest text-primary">Le Codex</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Bibliothèque juridique
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Chaque code est un ouvrage à explorer. Ouvrez un tome pour parcourir ses livres, chapitres et articles.
        </p>
      </header>

      {codes.length === 0 ? (
        <div className="hall flex flex-col items-center gap-3 p-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <LibraryIcon className="h-7 w-7 text-primary" />
          </span>
          <p className="font-display text-lg font-semibold">Le Codex se remplit bientôt</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Les premiers codes juridiques seront publiés très prochainement.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {codes.map((code) => (
            <Link
              key={code.id}
              href={`/library/${code.id}`}
              className="hall group flex flex-col p-6 transition-all hover:-translate-y-1 hover:border-primary/30"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <BookMarked className="h-5 w-5 text-primary" />
                </span>
                {code.country && (
                  <span className="rounded-full bg-muted px-2.5 py-1 font-mono text-xs font-semibold text-muted-foreground">
                    {code.country.iso}
                  </span>
                )}
              </div>

              <h2 className="font-display text-xl font-semibold leading-tight">{code.name}</h2>
              {code.description && (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{code.description}</p>
              )}

              <div className="mt-auto flex items-center justify-between pt-5">
                <span className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{code.articleCount}</span> article{code.articleCount > 1 ? "s" : ""}
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-transform group-hover:translate-x-0.5">
                  Explorer <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
