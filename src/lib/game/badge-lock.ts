import { stageRank } from "../curriculum";
import { findPathBadge, knowledgePath, type KnowledgePathFile } from "./path";
import type { KnowledgeStage } from "./types";

function stageOfBadge(badgeId: string, path: KnowledgePathFile = knowledgePath): KnowledgeStage | null {
  const badge = findPathBadge(badgeId, path);
  if (!badge) return null;
  for (const stage of path.stages) {
    if (stage.badges.some((item) => item.id === badge.id)) return stage.stage;
  }
  return null;
}

/** Shown when a later badge is still closed. It does not name a stage, an age, or a difficulty. */
export const BADGE_AHEAD_NOTE = "Unlocks after you earn every badge before it.";

export const BADGE_MISSING_NOTE = "We couldn't find that badge. The path is still here when you want it.";

/** These stages stay closed until the player's own stage reaches them. */
const STAGES_LOCKED_UNTIL_REACHED = new Set<KnowledgeStage>(["Fruitful", "Deep Roots"]);

/**
 * Fruitful and Deep Roots open only when the player has reached that stage.
 * Earlier badges keep their own runs. An id that is not on the path is left to the caller.
 */
export function isBadgeUnlocked(progress: { stage?: KnowledgeStage }, badgeId: string): boolean {
  const stage = stageOfBadge(badgeId);
  if (!stage || !STAGES_LOCKED_UNTIL_REACHED.has(stage)) return true;
  return stageRank(progress.stage ?? "Seed") >= stageRank(stage);
}

export function resolvePlayBadge(rawId: string) {
  const id = rawId.trim();
  if (!id) return null;
  return findPathBadge(id);
}
