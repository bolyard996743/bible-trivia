import { stageRank, STAGES } from "../curriculum";
import type { GameProgress, KnowledgeStage, Question } from "./types";
import { knowledgePath, stagePath, type AdvanceRule, type KnowledgePathFile, type PathBadge } from "./path";

export function sectionSlug(section: string): string {
  return section
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function stageSlug(stage: string): string {
  return sectionSlug(stage);
}

/**
 * Questions that fill a badge.
 * The saved list counts, and so does a mastered question with no misses.
 * An empty list is not proof that nothing was earned: older saves, and account
 * rows that never stored the flag, still have the answer on the mastered list.
 */
export function earnedFirstTryIds(progress: GameProgress | undefined): string[] {
  if (!progress) return [];
  const explicit = progress.firstTryIds ?? [];
  const inferred = progress.masteredIds.filter((id) => (progress.missCounts?.[id] ?? 0) === 0);
  return [...new Set([...explicit, ...inferred])];
}

/** A first try is either recorded or inferred from a mastered question with no misses. */
export function passedFirstTry(progress: GameProgress, questionId: string): boolean {
  return earnedFirstTryIds(progress).includes(questionId);
}

export function badgesFor(stage: KnowledgeStage, path: KnowledgePathFile = knowledgePath): PathBadge[] {
  return stagePath(stage, path)?.badges ?? [];
}

/** A badge with no questions yet cannot be earned. The slot stays empty. */
export function badgeEarned(progress: GameProgress, badge: PathBadge): boolean {
  if (badge.questionIds.length === 0) return false;
  return badge.questionIds.every((id) => passedFirstTry(progress, id));
}

function badgesThatCount(badges: PathBadge[], rule: AdvanceRule): PathBadge[] {
  if (rule === "badges-with-questions") return badges.filter((badge) => badge.questionIds.length > 0);
  return badges;
}

/**
 * The next stage opens only when this returns ready.
 * The live rule is advanceRule in content/knowledge_path.json.
 */
export function gateFromBadges(
  progress: GameProgress,
  path: KnowledgePathFile = knowledgePath,
): { ready: boolean; cleared: number; required: number } {
  const stage = progress.stage ?? "Seed";
  const requiredBadges = badgesThatCount(badgesFor(stage, path), path.advanceRule);
  if (requiredBadges.length === 0) return { ready: true, cleared: 0, required: 0 };
  const cleared = requiredBadges.filter((badge) => badgeEarned(progress, badge)).length;
  return { ready: cleared >= requiredBadges.length, cleared, required: requiredBadges.length };
}

/**
 * Seed through the player's stage, top to bottom.
 * Placement is the only way to skip stages, and those skipped stages stay in the list.
 * Nothing after progress.stage is drawn, even when cycle and tier would name a later stage
 * or the current stage's written questions are already finished.
 */
export function visibleMapStages(progress: GameProgress): KnowledgeStage[] {
  const current = progress.stage ?? "Seed";
  const end = stageRank(current);
  return STAGES.filter((_, index) => index <= end);
}

export function selectBadgeQuestion(
  questions: Question[],
  progress: GameProgress,
  badge: PathBadge,
): Question | null {
  const byId = new Map(questions.map((question) => [question.id, question]));
  const mastered = new Set(progress.masteredIds);
  for (const id of badge.questionIds) {
    const question = byId.get(id);
    if (question && !mastered.has(id)) return question;
  }
  return null;
}
