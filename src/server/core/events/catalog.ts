/**
 * Catalogue des événements domaine (bus interne). Découple les modules :
 * un module émet, d'autres réagissent (notifications, rollups analytics, cache…).
 */
export type DomainEvent =
  | { name: "AttemptRecorded"; userId: string; articleVersionId: string; phase: number; correct: boolean }
  | { name: "PhaseCompleted"; userId: string; articleVersionId: string; phase: number }
  | { name: "ArticleMastered"; userId: string; articleId: string; articleVersionId: string }
  | { name: "SealEarned"; userId: string; articleId: string }
  | { name: "ExamPassed"; userId: string; examId: string; score: number }
  | { name: "StreakUpdated"; userId: string; streakDays: number }
  | { name: "ArticleVersionPublished"; articleId: string; articleVersionId: string };

export type DomainEventName = DomainEvent["name"];
export type EventOf<N extends DomainEventName> = Extract<DomainEvent, { name: N }>;
