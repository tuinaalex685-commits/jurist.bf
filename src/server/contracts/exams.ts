/** Contrats du module Examens (« L'Épreuve »). Jamais de corrigé exposé au client. */
export type ExamBriefing = {
  id: string;
  title: string;
  difficulty: string | null;
  durationSeconds: number;
  passThreshold: number;
  questionCount: number;
};

export type ExamQuestion = {
  id: string;
  type: string;
  prompt: Record<string, unknown>; // payload SANS le champ "correct"
};

export type ExamSessionStart = { sessionId: string; already: boolean };

export type ExamSessionView = {
  sessionId: string;
  examId: string;
  startedAt: string;
  submittedAt: string | null;
  durationSeconds: number;
  questions: ExamQuestion[];
  answers: Record<string, unknown>;
};

export type ExamResult = {
  score: number;
  passed: boolean;
  correct: number;
  total: number;
  xpGained: number;
  already: boolean;
};
