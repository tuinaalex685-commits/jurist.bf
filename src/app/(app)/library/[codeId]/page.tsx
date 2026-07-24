import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import { getCodeTree } from "@/server/modules/catalog/service";
import { isAppError } from "@/server/core/errors";
import type { ArticleSummary, CodeTree, StructureNode } from "@/server/contracts/catalog";
import { cn } from "@/lib/utils";

const DIFFICULTY: Record<string, { label: string; cls: string }> = {
  simple: { label: "Simple", cls: "text-cat-emerald bg-cat-emerald/10" },
  intermediaire: { label: "Intermédiaire", cls: "text-cat-sky bg-cat-sky/10" },
  complexe: { label: "Complexe", cls: "text-cat-amber bg-cat-amber/10" },
  piege: { label: "Piège", cls: "text-cat-rose bg-cat-rose/10" },
};

export default async function CodePage(props: { params: Promise<{ codeId: string }> }) {
  const { codeId } = await props.params;

  let tree: CodeTree;
  try {
    tree = await getCodeTree(codeId);
  } catch (err) {
    if (isAppError(err) && err.code === "NOT_FOUND") notFound();
    throw err;
  }

  const childrenOf = (parentId: string | null) =>
    tree.nodes.filter((n) => n.parentId === parentId);
  const articlesOf = (nodeId: string | null) =>
    tree.articles.filter((a) => a.nodeId === nodeId);

  const looseArticles = articlesOf(null);
  const roots = childrenOf(null);
  const totalArticles = tree.articles.length;

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-start gap-4">
        <Link
          href="/library"
          aria-label="Retour à la bibliothèque"
          className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-primary">Codex</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">{tree.code.name}</h1>
          {tree.code.description && (
            <p className="mt-2 max-w-3xl text-muted-foreground">{tree.code.description}</p>
          )}
          <p className="mt-3 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{totalArticles}</span> article{totalArticles > 1 ? "s" : ""} au total
          </p>
        </div>
      </div>

      {totalArticles === 0 && roots.length === 0 ? (
        <div className="hall p-10 text-center text-muted-foreground">
          Ce code n&apos;a pas encore de contenu publié.
        </div>
      ) : (
        <div className="space-y-6">
          {looseArticles.length > 0 && (
            <ul className="space-y-2.5">
              {looseArticles.map((a) => (
                <ArticleRow key={a.id} article={a} />
              ))}
            </ul>
          )}
          {roots.map((node) => (
            <NodeBranch key={node.id} node={node} childrenOf={childrenOf} articlesOf={articlesOf} depth={0} />
          ))}
        </div>
      )}
    </div>
  );
}

function NodeBranch({
  node,
  childrenOf,
  articlesOf,
  depth,
}: {
  node: StructureNode;
  childrenOf: (parentId: string | null) => StructureNode[];
  articlesOf: (nodeId: string | null) => ArticleSummary[];
  depth: number;
}) {
  const subNodes = childrenOf(node.id);
  const articles = articlesOf(node.id);

  return (
    <section className={cn(depth > 0 && "border-l border-border pl-4")}>
      <div className="mb-3 flex items-baseline gap-2">
        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
          {node.type}{node.number ? ` ${node.number}` : ""}
        </span>
        <h2 className="font-display text-lg font-semibold">{node.label}</h2>
      </div>

      {articles.length > 0 && (
        <ul className="mb-4 space-y-2.5">
          {articles.map((a) => (
            <ArticleRow key={a.id} article={a} />
          ))}
        </ul>
      )}

      {subNodes.length > 0 && (
        <div className="space-y-5">
          {subNodes.map((n) => (
            <NodeBranch key={n.id} node={n} childrenOf={childrenOf} articlesOf={articlesOf} depth={depth + 1} />
          ))}
        </div>
      )}
    </section>
  );
}

function ArticleRow({ article }: { article: ArticleSummary }) {
  const diff = article.difficulty ? DIFFICULTY[article.difficulty] : null;

  const inner = (
    <div className="hall flex items-center gap-4 p-4 transition-all group-hover:border-primary/30">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-mono text-xs font-bold text-primary">
        {article.number}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{article.title ?? `Article ${article.number}`}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {diff && <span className={cn("rounded-full px-2 py-0.5 font-semibold", diff.cls)}>{diff.label}</span>}
          {article.estimatedMinutes && <span>≈ {article.estimatedMinutes} min</span>}
        </div>
      </div>
      {article.published ? (
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-action">
          Étudier <ArrowRight className="h-4 w-4" />
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <Lock className="h-3.5 w-3.5" /> Bientôt
        </span>
      )}
    </div>
  );

  if (!article.published) {
    return <li aria-disabled className="block cursor-not-allowed opacity-70">{inner}</li>;
  }
  return (
    <li>
      <Link href={`/learn/${article.id}`} className="group block">
        {inner}
      </Link>
    </li>
  );
}
