import { TIER_WEIGHT } from "../game/placement";
import type { Tier } from "../game/types";

/**
 * Leaderboard points come only from questions the player has mastered.
 * Foundation is 1, intermediate is 2, advanced is 3, and expert is 4.
 * Misses, streaks, and the Knowledge Path do not add points.
 */
export function pointsFromProgress(
  questions: { id: string; tier: Tier }[],
  masteredIds: string[],
): number {
  const mastered = new Set(masteredIds);
  return questions.reduce((sum, question) => {
    if (!mastered.has(question.id)) return sum;
    return sum + TIER_WEIGHT[question.tier];
  }, 0);
}
