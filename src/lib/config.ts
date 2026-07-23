/**
 * Configuration centrale de Jurist BF.
 *
 * Le nom contient « BF » (premier marché = Burkina Faso), mais l'architecture
 * reste multi-pays / multi-codes : le pays par défaut est une simple valeur de
 * configuration, jamais une hypothèse codée en dur ailleurs.
 */

export const APP_NAME = "Jurist BF";
export const APP_TAGLINE = "Apprentissage juridique actif";

/** Pays d'amorçage du MVP (ISO 3166-1 alpha-2). Modifiable pour l'ouverture internationale. */
export const DEFAULT_COUNTRY_ISO =
  process.env.NEXT_PUBLIC_DEFAULT_COUNTRY ?? "BF";

/**
 * Statuts du contenu pédagogique généré par l'IA.
 * L'IA produit du `draft` ; seul l'admin fait passer `validated` puis `published`.
 * Rien n'est montré à l'apprenant avant `published`.
 */
export const CONTENT_STATUS = ["draft", "validated", "published"] as const;
export type ContentStatus = (typeof CONTENT_STATUS)[number];

/** Les phases du parcours pédagogique par article. */
export const LEARNING_PHASES = [
  { id: 0, key: "intro", label: "Introduction de la notion" },
  { id: 1, key: "reconnaissance", label: "Reconnaissance par situations" },
  { id: 2, key: "comprehension", label: "Association et compréhension" },
  { id: 3, key: "memorisation", label: "Ancrage et mémorisation" },
  { id: 4, key: "synthese", label: "Synthèse (après plusieurs articles)" },
] as const;
