import { MOCK_ARTICLE, MOCK_NOTION, MOCK_SITUATIONS, MOCK_COMPREHENSION, MOCK_MEMORIZATION } from "@/lib/mock-data";
import { LearningEngine } from "@/components/learn/LearningEngine";

export default async function LearnPage(props: { params: Promise<{ articleId: string }> }) {
  // Dans le monde réel, on chargerait l'article depuis Supabase à partir de articleId.
  // MVP frontend : données mock.
  await props.params;

  return (
    <LearningEngine
      article={MOCK_ARTICLE}
      notion={MOCK_NOTION}
      situations={MOCK_SITUATIONS}
      comprehension={MOCK_COMPREHENSION}
      memorization={MOCK_MEMORIZATION}
    />
  );
}
