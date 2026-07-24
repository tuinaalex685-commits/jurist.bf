/**
 * Contrats du module Learning (le parcours). IMPORTANT : ce contrat **n'expose
 * jamais** les bonnes réponses ni les explications au client — la notation est
 * faite côté serveur (endpoint de tentative).
 */
export type PhaseIntro = {
  intro: string | null;
  why: string | null;
  protects: string | null;
  outcomes: string[];
};

export type ParcoursSituation = {
  id: string;
  level: "simple" | "intermediaire" | "complexe" | "piege";
  scenario: string;
  context: string | null;
  characters: { name: string; role: string }[];
  keyFacts: string[];
  question: string;
  // pas de `answer` ni `explanation` : révélés par l'endpoint de tentative.
};

export type ParcoursComprehension = {
  id: string;
  type: string;
  content: string;
};

export type ParcoursMemorization = {
  id: string;
  clozeTemplate: string; // contient des marqueurs [BLANK_n]
  blanksCount: number; // pas les mots corrects
};

export type Parcours = {
  article: { id: string; number: string; title: string | null };
  articleVersionId: string;
  intro: PhaseIntro | null;
  situations: ParcoursSituation[];
  comprehension: ParcoursComprehension[];
  memorization: ParcoursMemorization[];
};
