import { stageRank } from "@/lib/curriculum";
import { knowledgePath, type KnowledgePathFile } from "@/lib/game/path";
import type { KnowledgeStage, Question } from "@/lib/game/types";

let cachedPath: KnowledgePathFile | null = null;
let cachedStages: Map<string, KnowledgeStage> | null = null;

/** Earliest path stage for each question id. Rebuilt when a different path object is passed. */
export function badgeStageByQuestion(path: KnowledgePathFile = knowledgePath): Map<string, KnowledgeStage> {
  if (path === cachedPath && cachedStages) return cachedStages;
  const map = new Map<string, KnowledgeStage>();
  for (const stage of path.stages) {
    for (const badge of stage.badges) {
      for (const id of badge.questionIds) {
        const prior = map.get(id);
        if (!prior || stageRank(stage.stage) < stageRank(prior)) map.set(id, stage.stage);
      }
    }
  }
  cachedPath = path;
  cachedStages = map;
  return map;
}

/** The stage a question belongs to. A path badge wins over a loose tag. */
export function stageForQuestion(question: Question, path: KnowledgePathFile = knowledgePath): KnowledgeStage {
  return badgeStageByQuestion(path).get(question.id) ?? question.stage ?? "Seed";
}

export function stageReached(question: Question, stage: KnowledgeStage, path: KnowledgePathFile = knowledgePath): boolean {
  return stageRank(stageForQuestion(question, path)) <= stageRank(stage);
}
