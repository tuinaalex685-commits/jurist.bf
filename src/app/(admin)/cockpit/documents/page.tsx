import { requireContentAdminPage } from "@/server/modules/admin/guard";
import { listDocuments, listPrompts } from "@/server/modules/ai/service";
import { PageHeader, SectionTitle } from "@/components/admin/ui/page-header";
import { DataTable, TableBody, TableEmpty, TableHead, TableRow, TableTd, TableTh } from "@/components/admin/ui/data-table";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const DOC_STATUS: Record<string, string> = {
  uploaded: "Importé",
  parsing: "Analyse en cours",
  parsed: "Analysé",
  failed: "Échec",
};

export default async function DocumentsPage() {
  await requireContentAdminPage();
  const [documents, prompts] = await Promise.all([listDocuments(), listPrompts("master")]);
  const activePrompt = prompts.find((p) => p.isActive) ?? null;

  return (
    <>
      <PageHeader
        title="Documents sources & Prompt Maître"
        description="Textes officiels importés et versions du prompt. Changer de prompt change l'empreinte d'entrée, donc régénère de façon contrôlée."
      />

      <section className="mb-6">
        <SectionTitle hint={`${prompts.length} version(s)`}>Prompt Maître</SectionTitle>
        {activePrompt ? (
          <div className="hall p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge>Version {activePrompt.version}</Badge>
              <span className="font-mono text-xs text-muted-foreground">{activePrompt.model}</span>
              <span className="font-mono text-xs text-muted-foreground">
                créé le {new Date(activePrompt.createdAt).toLocaleDateString("fr-FR")}
              </span>
            </div>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-muted/50 p-4 font-mono text-xs leading-relaxed text-foreground">
              {activePrompt.body}
            </pre>
          </div>
        ) : (
          <div className="hall px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Aucun prompt actif. La génération est impossible tant qu&apos;une version n&apos;est pas activée.
            </p>
          </div>
        )}
      </section>

      <section>
        <SectionTitle hint={`${documents.length} document(s)`}>Documents importés</SectionTitle>
        <DataTable>
          <TableHead>
            <TableRow>
              <TableTh>Fichier</TableTh>
              <TableTh>Type</TableTh>
              <TableTh>État</TableTh>
              <TableTh>Importé le</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.length === 0 && <TableEmpty colSpan={4}>Aucun document source importé.</TableEmpty>}
            {documents.map((d) => (
              <TableRow key={d.id}>
                <TableTd className="font-medium">{d.filename}</TableTd>
                <TableTd className="font-mono text-xs text-muted-foreground">{d.mime}</TableTd>
                <TableTd>
                  <span className={d.status === "failed" ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
                    {DOC_STATUS[d.status] ?? d.status}
                  </span>
                </TableTd>
                <TableTd className="font-mono text-xs text-muted-foreground">
                  {new Date(d.createdAt).toLocaleString("fr-FR")}
                </TableTd>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
      </section>
    </>
  );
}
