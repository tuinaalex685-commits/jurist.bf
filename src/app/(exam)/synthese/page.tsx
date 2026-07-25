import type { Metadata } from "next";
import { getBriefing } from "@/server/modules/exams/service";
import { ExamRunner } from "@/components/exams/exam-runner";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Examen" };

// Examen unique du MVP (Code pénal — Niveau 1). Sélection multi-examens = évolution future.
const DEFAULT_EXAM_ID = "f0000000-0000-4000-8000-000000000001";

export default async function SynthesePage() {
  const briefing = await getBriefing(DEFAULT_EXAM_ID);
  return <ExamRunner briefing={briefing} />;
}
