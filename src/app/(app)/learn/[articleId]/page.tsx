import { notFound } from "next/navigation";
import { getParcours } from "@/server/modules/learning/service";
import { isAppError } from "@/server/core/errors";
import { LearningEngine } from "@/components/learn/LearningEngine";
import type { Parcours } from "@/server/contracts/learning";

export const dynamic = "force-dynamic";

export default async function LearnPage(props: { params: Promise<{ articleId: string }> }) {
  const { articleId } = await props.params;

  let parcours: Parcours;
  try {
    parcours = await getParcours(articleId);
  } catch (err) {
    if (isAppError(err) && err.code === "NOT_FOUND") notFound();
    throw err;
  }

  return <LearningEngine parcours={parcours} />;
}
