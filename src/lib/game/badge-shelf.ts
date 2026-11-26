import { badgeEarned, visibleBadges } from "./badges";
import { knowledgePath, type KnowledgePathFile } from "./path";
import type { GameProgress, Question } from "./types";

export type ShelfBadge = {
  id: string;
  name: string;
  art: string;
  ref: string;
  kind: "path" | "daily";
};

function firstRef(questionIds: readonly string[], byId: Map<string, Question>): string | null {
  for (const id of questionIds) {
    const question = byId.get(id);
    const ref = question?.teaching.verses.find((verse) => verse.ref.trim().length > 0)?.ref.trim();
    if (ref) return ref;
  }
  return null;
}

/** Earned path badges and their verse references. Daily badges are not included. */
export function pathShelfBadges(
  progress: GameProgress,
  questions: readonly Question[],
  path: KnowledgePathFile = knowledgePath,
): ShelfBadge[] {
  const byId = new Map<string, Question>();
  for (const question of questions) {
    if (!byId.has(question.id)) byId.set(question.id, question);
  }
  const entries: ShelfBadge[] = [];
  for (const stage of path.stages) {
    for (const badge of visibleBadges(stage.badges)) {
      if (!badgeEarned(progress, badge)) continue;
      const ref = firstRef(badge.questionIds, byId);
      if (!ref) continue;
      entries.push({ id: badge.id, name: badge.name, art: badge.art, ref, kind: "path" });
    }
  }
  return entries;
}
