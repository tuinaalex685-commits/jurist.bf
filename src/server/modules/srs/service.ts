import "server-only";
import * as repo from "./repository";
import type { SrsGradeResult, SrsSession } from "@/server/contracts/srs";

export async function getSession(): Promise<SrsSession> {
  const cards = await repo.getDueCards();
  return { cards, countsByState: repo.countsByState(cards) };
}

export const getCounts = repo.getCounts;

export async function grade(cardId: string, gradeValue: number): Promise<SrsGradeResult> {
  return repo.gradeCard(cardId, gradeValue);
}
