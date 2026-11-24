import { stageRank, STAGES } from "../curriculum";
import { badgeRunEarned, isBadgeWaiting, openAttemptCorrectIds, passedFirstTry } from "./badge-retry";
import type { GameProgress, KnowledgeStage, Question } from "./types";
import { knowledgePath, stagePath, type AdvanceRule, type KnowledgePathFile, type PathBadge } from "./path";

export { earnedFirstTryIds, passedFirstTry } from "./badge-retry";

export function sectionSlug(section: string): string {
  return section
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function stageSlug(stage: string): string {
  return sectionSlug(stage);
}

export function badgesFor(stage: KnowledgeStage, path: KnowledgePathFile = knowledgePath): PathBadge[] {
  return stagePath(stage, path)?.badges ?? [];
}

/**
 * A badge with no questions yet cannot be earned. The slot stays empty.
 * A stored attempt earns the badge only when every question was right in that attempt.
 * Older saves, which have no attempt record, still count first-try answers.
 */
export function badgeEarned(progress: GameProgress, badge: PathBadge): boolean {
  if (badge.questionIds.length === 0) return false;
  const attempt = badgeRunEarned(progress, badge);
  if (attempt !== null) return attempt;
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
export function visibleMapStages(progress: { stage?: KnowledgeStage }): KnowledgeStage[] {
  const current = progress.stage ?? "Seed";
  const end = stageRank(current);
  return STAGES.filter((_, index) => index <= end);
}

export function stageForPathBadge(id: string, path: KnowledgePathFile = knowledgePath): KnowledgeStage | null {
  for (const stage of path.stages) {
    if (stage.badges.some((badge) => badge.id === id)) return stage.stage;
  }
  return null;
}

/** The badge's own stage, never the player's later stage. */
export function badgeProgressLabel(badgeId: string, section: string, path: KnowledgePathFile = knowledgePath): string {
  const stage = stageForPathBadge(badgeId, path);
  return stage ? `${stage} · ${section}` : section;
}

export function badgeCircleName(name: string, earned: boolean): string {
  return earned ? `${name}. Earned` : `${name}. Not earned yet`;
}

/** Link name for a badge. Earned and empty keep the original wording. A 24-hour lock adds the clock. */
export function badgeStatusLabel(name: string, status: "earned" | "empty" | "locked"): string {
  if (status === "earned") return badgeCircleName(name, true);
  if (status === "locked") return `${badgeCircleName(name, false)}. Locked for 24 hours`;
  return badgeCircleName(name, false);
}

/**
 * The questions a badge attempt asks, in path order, each with every choice.
 *
 * This is the runtime list. It does not apply the ladder's tier mix, a section
 * cut, an age filter, mastery, placement, or a previous miss. Seed creation
 * spans Genesis 1 and Genesis 2; keeping only the open section served 4.
 * Sprout Good News includes its intermediate question; a tier cut would drop it.
 * Choice order for a retry is a separate step and is not used here.
 */
export function questionsForBadgeRun(questions: Question[], badge: PathBadge): Question[] {
  const byId = new Map<string, Question>();
  for (const question of questions) {
    if (!byId.has(question.id)) byId.set(question.id, question);
  }
  const run: Question[] = [];
  for (const id of badge.questionIds) {
    const question = byId.get(id);
    if (!question) continue;
    run.push({
      ...question,
      choices: question.choices.map((choice) => ({ id: choice.id, text: choice.text })),
    });
  }
  return run;
}

/** Choices shown while a badge question is asked. A stored miss does not drop or reshuffle them. */
export function choicesForBadgeAsk(question: Question): Question["choices"] {
  return question.choices.map((choice) => ({ id: choice.id, text: choice.text }));
}

export function selectBadgeQuestion(
  questions: Question[],
  progress: GameProgress,
  badge: PathBadge,
  now: Date = new Date(),
): Question | null {
  if (badgeEarned(progress, badge)) return null;
  if (isBadgeWaiting(progress, badge.id, now)) return null;
  const answered = new Set(openAttemptCorrectIds(progress, badge.id));
  for (const question of questionsForBadgeRun(questions, badge)) {
    if (answered.has(question.id)) continue;
    return question;
  }
  return null;
}
