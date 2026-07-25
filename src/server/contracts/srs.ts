/** Contrats du module SRS (révision espacée). */
export type SrsState = "urgent" | "fragile" | "correct" | "mastered" | "anchored";

export type SrsCard = {
  id: string;
  articleId: string;
  number: string;
  title: string | null;
  state: SrsState;
  dueAt: string;
};

export type SrsSession = {
  cards: SrsCard[];
  countsByState: Record<SrsState, number>;
};

export type SrsGradeResult = {
  state: SrsState;
  intervalDays: number;
  dueAt: string;
};

export type SrsCounts = { today: number; tomorrow: number; week: number };
