import { knowledgePath, type KnowledgePathFile } from "./path";
import { stageForQuestion } from "./question-stage";
import type { KnowledgeStage, Question } from "./types";

/** A verse reference from the stage that just opened. Later stages are not used. */
export function stageVerse(
  questions: readonly Question[],
  stage: KnowledgeStage,
  path: KnowledgePathFile = knowledgePath,
): { id: string; ref: string } | null {
  const pool = questions
    .filter((question) => stageForQuestion(question, path) === stage)
    .filter((question) => question.teaching.verses.some((verse) => verse.ref.trim().length > 0))
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));
  const question = pool[0];
  const ref = question?.teaching.verses.find((verse) => verse.ref.trim().length > 0)?.ref.trim();
  if (!question || !ref) return null;
  return { id: question.id, ref };
}
