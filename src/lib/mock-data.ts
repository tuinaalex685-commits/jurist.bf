export type Country = {
  id: string;
  iso: string;
  name: string;
};

export type LegalCode = {
  id: string;
  country_id: string;
  name: string;
  type: string;
  description: string;
};

export type Notion = {
  id: string;
  slug: string;
  name: string;
  intro: string;
  // Narratif "Découverte" (Phase 0)
  why: string;        // Pourquoi cette notion existe ?
  protects: string;   // Que protège la loi ?
  outcomes: string[]; // Ce que vous serez capable de faire après cette étape
};

export type Article = {
  id: string;
  code_id: string;
  notion_id: string;
  number: string;
  title: string;
  official_text: string;
  position: number;
};

export type SituationCharacter = {
  name: string;
  role: string;
};

export type Situation = {
  id: string;
  article_id: string;
  level: "simple" | "intermediaire" | "complexe" | "piege";
  scenario: string;
  question: string;
  answer: string;
  explanation: string;
  // Structure "dossier juridique" (Phase 1)
  context?: string;
  characters?: SituationCharacter[];
  keyFacts?: string[];
};

export type ComprehensionBlock = {
  id: string;
  article_id: string;
  type: "elements" | "conditions" | "limites" | "exceptions" | "distinction" | "contre_exemple";
  content: string;
};

export type MemorizationItem = {
  id: string;
  article_id: string;
  cloze_template: string;
  blanks: string[];
};

export const MOCK_COUNTRY: Country = {
  id: "bf-123",
  iso: "BF",
  name: "Burkina Faso",
};

export const MOCK_LEGAL_CODES: LegalCode[] = [
  {
    id: "code-penal-bf",
    country_id: "bf-123",
    name: "Code pénal burkinabè",
    type: "penal",
    description: "Loi N° 025-2018/AN portant Code pénal du Burkina Faso.",
  },
  {
    id: "code-civil-bf",
    country_id: "bf-123",
    name: "Code des personnes et de la famille",
    type: "civil",
    description: "Code régissant le droit de la famille.",
  }
];

export const MOCK_NOTION: Notion = {
  id: "notion-abus-confiance",
  slug: "abus-de-confiance",
  name: "Abus de confiance",
  intro: "L'abus de confiance consiste à détourner des fonds, des valeurs ou un bien quelconque qui ont été remis à charge de les rendre, de les représenter ou d'en faire un usage déterminé. C'est une trahison de la confiance qui avait été placée en l'auteur.",
  why: "La vie économique et sociale repose sur la confiance : on prête, on confie, on mandate. Sans protection, quiconque reçoit un bien pour un usage précis pourrait le garder impunément. La loi sanctionne cette trahison pour sécuriser les remises volontaires.",
  protects: "Elle protège la personne qui a remis un bien de bonne foi — propriétaire, possesseur ou simple détenteur — contre celui qui abuse de la mission qui lui avait été confiée.",
  outcomes: [
    "Distinguer l'abus de confiance du vol et de l'escroquerie",
    "Repérer une remise volontaire préalable dans une situation réelle",
    "Identifier le moment où l'usage devient un détournement",
  ],
};

export const MOCK_ARTICLE: Article = {
  id: "art-613-1",
  code_id: "code-penal-bf",
  notion_id: "notion-abus-confiance",
  number: "613-1",
  title: "De l'abus de confiance",
  official_text: "L'abus de confiance est le fait par une personne de détourner, au préjudice d'autrui, des fonds, des valeurs ou un bien quelconque qui lui ont été remis et qu'elle a acceptés à charge de les rendre, de les représenter ou d'en faire un usage ou un emploi déterminé.",
  position: 1,
};

export const MOCK_SITUATIONS: Situation[] = [
  {
    id: "sit-1",
    article_id: "art-613-1",
    level: "simple",
    scenario: "Aminata prête son ordinateur à son collègue Moussa pour le week-end. Le lundi, Moussa refuse de le rendre et le revend au marché.",
    question: "S'agit-il d'un abus de confiance ?",
    answer: "Oui",
    explanation: "Le bien a été remis volontairement à charge de le rendre, et Moussa l'a détourné en le revendant.",
    context: "Un prêt informel entre collègues, avec un accord clair de restitution après le week-end.",
    characters: [
      { name: "Aminata", role: "Propriétaire de l'ordinateur" },
      { name: "Moussa", role: "Collègue à qui le bien est confié" },
    ],
    keyFacts: [
      "Remise volontaire de l'ordinateur",
      "Accord explicite de le rendre le lundi",
      "Moussa le revend au marché",
    ],
  },
  {
    id: "sit-2",
    article_id: "art-613-1",
    level: "piege",
    scenario: "Karim vole le portefeuille de Sophie dans son sac alors qu'elle ne regarde pas.",
    question: "S'agit-il d'un abus de confiance ?",
    answer: "Non",
    explanation: "Il s'agit d'un vol. Pour qu'il y ait abus de confiance, il faut qu'il y ait eu une remise volontaire préalable du bien.",
    context: "Une soustraction à l'insu de la victime, sans aucune remise préalable.",
    characters: [
      { name: "Karim", role: "Auteur de la soustraction" },
      { name: "Sophie", role: "Victime" },
    ],
    keyFacts: [
      "Aucune remise volontaire",
      "Le bien est pris à l'insu de Sophie",
      "Absence de mission confiée",
    ],
  },
  {
    id: "sit-3",
    article_id: "art-613-1",
    level: "intermediaire",
    scenario: "Une entreprise confie un véhicule de service à un employé pour ses tournées professionnelles. L'employé utilise le véhicule pour faire le taxi le week-end à son propre profit.",
    question: "L'employé a-t-il commis un abus de confiance ?",
    answer: "Oui",
    explanation: "Le véhicule a été remis pour un usage déterminé (professionnel). L'utiliser à des fins personnelles pour en tirer profit constitue un détournement.",
    context: "Un bien remis pour un usage professionnel déterminé, détourné à des fins personnelles lucratives.",
    characters: [
      { name: "L'entreprise", role: "Propriétaire du véhicule" },
      { name: "L'employé", role: "Détenteur pour un usage déterminé" },
    ],
    keyFacts: [
      "Remise pour un usage précis (tournées professionnelles)",
      "Usage personnel lucratif le week-end",
      "Comportement en propriétaire de fait",
    ],
  }
];

export const MOCK_COMPREHENSION: ComprehensionBlock[] = [
  {
    id: "comp-1",
    article_id: "art-613-1",
    type: "conditions",
    content: "Une remise volontaire préalable du bien par la victime.",
  },
  {
    id: "comp-2",
    article_id: "art-613-1",
    type: "elements",
    content: "Un accord sur la destination du bien (à rendre, représenter ou pour un usage déterminé).",
  },
  {
    id: "comp-3",
    article_id: "art-613-1",
    type: "elements",
    content: "Un détournement (acte manifestant la volonté de se comporter en propriétaire).",
  },
  {
    id: "comp-4",
    article_id: "art-613-1",
    type: "conditions",
    content: "Un préjudice subi par le propriétaire, le possesseur ou le détenteur du bien.",
  }
];

export const MOCK_MEMORIZATION: MemorizationItem = {
  id: "memo-1",
  article_id: "art-613-1",
  cloze_template: "L'abus de confiance est le fait par une personne de [BLANK_1], au préjudice d'autrui, des fonds, des valeurs ou un bien quelconque qui lui ont été [BLANK_2] et qu'elle a acceptés à charge de les [BLANK_3], de les représenter ou d'en faire un usage ou un emploi déterminé.",
  blanks: ["détourner", "remis", "rendre"],
};

// ============================================================================
// Données du Dashboard (« Poste de commandement ») — mock frontend
// ============================================================================

export type EarnedSeal = {
  id: string;
  articleNumber: string;
  title: string;
  date: string;
};

export type DashboardData = {
  user: {
    honorific: string;
    firstName: string;
    rankLevel: number;
    rankName: string;
    nextRankName: string;
    xpIntoRank: number;
    xpForNextRank: number;
    streakDays: number;
  };
  mission: {
    rewardXp: number;
    rewardSeals: number;
    tasks: { id: string; label: string; done: boolean }[];
  };
  resume: {
    articleNumber: string;
    notion: string;
    phaseIndex: number;
    phaseName: string;
    progress: number; // 0..1
  };
  code: {
    name: string;
    mastered: number;
    total: number;
    weeksToMastery: number;
  };
  unlock: {
    name: string;
    remainingArticles: number;
  };
  weaknesses: string[];
  strengths: string[];
  revisions: { today: number; tomorrow: number; week: number };
  seals: EarnedSeal[];
  /** intensité d'assiduité par jour (déterministe → pas de mismatch d'hydratation) */
  activity: number[];
};

const buildActivity = (days: number): number[] =>
  Array.from({ length: days }, (_, i) => {
    const v = (i * 37 + 11) % 9;
    if (v < 3) return 0;
    if (v < 5) return 1;
    if (v < 7) return 2;
    if (v < 8) return 3;
    return 4;
  });

export const MOCK_DASHBOARD: DashboardData = {
  user: {
    honorific: "Maître",
    firstName: "Tuina",
    rankLevel: 2,
    rankName: "Initié",
    nextRankName: "Praticien",
    xpIntoRank: 380,
    xpForNextRank: 500,
    streakDays: 4,
  },
  mission: {
    rewardXp: 250,
    rewardSeals: 1,
    tasks: [
      { id: "m1", label: "Réviser 5 articles", done: true },
      { id: "m2", label: "Terminer la phase Compréhension", done: false },
      { id: "m3", label: "Réussir l'examen quotidien", done: false },
    ],
  },
  resume: {
    articleNumber: "613-1",
    notion: "Abus de confiance",
    phaseIndex: 2,
    phaseName: "Compréhension",
    progress: 0.4,
  },
  code: {
    name: "Code pénal burkinabè",
    mastered: 145,
    total: 520,
    weeksToMastery: 14,
  },
  unlock: {
    name: "Examen — Niveau 3",
    remainingArticles: 4,
  },
  weaknesses: ["Abus de confiance", "Vol", "Escroquerie"],
  strengths: ["Responsabilité civile", "Contrats", "Capacité juridique"],
  revisions: { today: 5, tomorrow: 3, week: 12 },
  seals: [
    { id: "s1", articleNumber: "511-1", title: "Le vol", date: "Hier" },
    { id: "s2", articleNumber: "324-2", title: "Escroquerie", date: "Il y a 2 j" },
    { id: "s3", articleNumber: "1382", title: "Responsabilité civile", date: "Il y a 3 j" },
    { id: "s4", articleNumber: "220-1", title: "La complicité", date: "Il y a 5 j" },
    { id: "s5", articleNumber: "121-3", title: "L'intention", date: "Il y a 6 j" },
  ],
  activity: buildActivity(119),
};
