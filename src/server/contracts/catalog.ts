/** Contrats du module Catalog (« le Codex ») — importables par le frontend. */

export type CountryRef = { iso: string; name: string };

export type CodeSummary = {
  id: string;
  name: string;
  type: string | null;
  description: string | null;
  country: CountryRef | null;
  articleCount: number;
};

export type StructureNode = {
  id: string;
  parentId: string | null;
  type: string;
  label: string;
  number: string | null;
  position: number;
};

export type ArticleSummary = {
  id: string;
  number: string;
  title: string | null;
  nodeId: string | null;
  difficulty: string | null;
  estimatedMinutes: number | null;
  published: boolean;
};

export type CodeTree = {
  code: { id: string; name: string; type: string | null; description: string | null };
  nodes: StructureNode[];
  articles: ArticleSummary[];
};

export type ArticleDetail = {
  id: string;
  number: string;
  title: string | null;
  difficulty: string | null;
  estimatedMinutes: number | null;
  code: { id: string; name: string };
  version: { id: string; versionNo: number; officialText: string; publishedAt: string | null } | null;
};

export type SearchHit = {
  id: string;
  number: string;
  title: string | null;
  codeId: string;
};
