/**
 * Contrats du module Learning — moteur par ACTIVITÉS.
 * Une phase est un conteneur d'activités. Le frontend reçoit un objet générique
 * `{ type, prompt }` et le rend via un registre de renderers ; il ne connaît pas
 * les activités à l'avance. AUCUNE solution/évaluation n'est exposée au client.
 */
export type Activity = {
  id: string;
  phase: number;
  position: number;
  /** Format ouvert : 'discovery' | 'situation_choice' | 'select_elements' |
   *  'ordering' | 'matching' | 'argued_answer' | 'cloze' | … (extensible sans migration). */
  type: string;
  objective: string | null;
  difficulty: string | null;
  weight: number;
  /** Payload d'affichage, dépendant du type (public). */
  prompt: Record<string, unknown>;
};

export type PhaseActivities = {
  phase: number;
  activities: Activity[];
};

export type Parcours = {
  article: { id: string; number: string; title: string | null };
  articleVersionId: string;
  phases: PhaseActivities[];
};

/** Récompense de maîtrise (décernée quand toutes les phases sont validées). */
export type MasteryReward = {
  mastered: boolean;
  isNew: boolean; // true seulement au moment de l'obtention
  xpGained: number;
  xpTotal: number;
  rankLevel: number;
};

/** Résultat d'une tentative — révélé APRÈS soumission (feedback compris). */
export type AttemptResult = {
  score: number; // 0..1
  passed: boolean;
  feedback: string | null;
  detail: Record<string, unknown>; // diagnostic (confusions, mots manquants…)
  phase: { index: number; score: number; completed: boolean };
  mastery: MasteryReward | null; // présent si la phase vient de compléter l'article
};
