import { stageRank, STAGES } from "../curriculum";
import { BADGE_AHEAD_NOTE, BADGE_MISSING_NOTE, isBadgeUnlocked } from "./badge-lock";

export { BADGE_AHEAD_NOTE, BADGE_MISSING_NOTE };
import { badgeRunEarned, isBadgeWaiting, openAttemptCorrectIds, passedFirstTry } from "./badge-retry";
import type { GameProgress, KnowledgeStage, Question } from "./types";
import {
  canonicalBadgeId,
  findPathBadge,
  knowledgePath,
  stagePath,
  type AdvanceRule,
  type KnowledgePathFile,
  type PathBadge,
} from "./path";

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

/** Badges with no questions are still being written and stay off every player view. */
export function visibleBadges(badges: readonly PathBadge[]): PathBadge[] {
  return badges.filter((badge) => badge.questionIds.length > 0);
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
 * The map still draws later stages, locked, via mapStageRows.
 */
export function visibleMapStages(progress: { stage?: KnowledgeStage }): KnowledgeStage[] {
  const current = progress.stage ?? "Seed";
  const end = stageRank(current);
  return STAGES.filter((_, index) => index <= end);
}

/**
 * Stages the player has reached, plus Fruitful and Deep Roots when those are still ahead.
 * An ahead stage is locked. A badge already earned there is still listed.
 */
export function mapStageRows(progress: GameProgress): { stage: KnowledgeStage; ahead: boolean; earned: { id: string; name: string }[] }[] {
  const current = stageRank(progress.stage ?? "Seed");
  const open = visibleMapStages(progress);
  const stages: KnowledgeStage[] = [...open];
  for (const stage of ["Fruitful", "Deep Roots"] as const) {
    if (!stages.includes(stage)) stages.push(stage);
  }
  return stages.map((stage) => ({
    stage,
    ahead: stageRank(stage) > current,
    earned: visibleBadges(badgesFor(stage))
      .filter((badge) => badgeEarned(progress, badge))
      .map((badge) => ({ id: badge.id, name: badge.name })),
  }));
}

export type BadgeRun =
  | { status: "missing"; message: string }
  | { status: "locked"; badge: PathBadge; message: string }
  | { status: "earned"; badge: PathBadge }
  | { status: "ready"; badge: PathBadge; questions: Question[] };

/**
 * What a badge link may show. A locked or missing id gets no question text.
 * Aliases are resolved before the id is judged.
 */
export function openBadgeRun(progress: GameProgress, rawId: string, questions: Question[]): BadgeRun {
  const badge = findPathBadge(rawId.trim());
  if (!badge) return { status: "missing", message: BADGE_MISSING_NOTE };
  if (badgeEarned(progress, badge)) return { status: "earned", badge };
  if (!isBadgeUnlocked(progress, badge.id)) return { status: "locked", badge, message: BADGE_AHEAD_NOTE };
  return { status: "ready", badge, questions: questionsForBadgeRun(questions, badge) };
}

export function stageForPathBadge(id: string, path: KnowledgePathFile = knowledgePath): KnowledgeStage | null {
  const wanted = canonicalBadgeId(id);
  for (const stage of path.stages) {
    if (stage.badges.some((badge) => badge.id === wanted)) return stage.stage;
  }
  return null;
}

/** The badge's own stage, never the player's later stage. */
export function badgeProgressLabel(badgeId: string, section: string, path: KnowledgePathFile = knowledgePath): string {
  const stage = stageForPathBadge(badgeId, path);
  return stage ? `${stage} · ${section}` : section;
}

export function badgeCircleName(name: string, earned: boolean): string {
  return earned ? `${name}, earned` : `${name}, not earned yet`;
}

/** Link name for a badge. A 24-hour wait adds the clock. An empty badge has no chip. */
export function badgeStatusLabel(name: string, status: "earned" | "empty" | "locked" | "sealed"): string {
  if (status === "earned") return badgeCircleName(name, true);
  if (status === "locked") return `${badgeCircleName(name, false)}. Locked for 24 hours`;
  if (status === "sealed") return `${badgeCircleName(name, false)}. ${BADGE_AHEAD_NOTE}`;
  return badgeCircleName(name, false);
}

/** True only on the answer that first completes the badge. */
export function badgeJustEarned(wasEarned: boolean, isEarned: boolean): boolean {
  return !wasEarned && isEarned;
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
  if (!isBadgeUnlocked(progress, badge.id)) return null;
  if (isBadgeWaiting(progress, badge.id, now)) return null;
  const answered = new Set(openAttemptCorrectIds(progress, badge.id));
  for (const question of questionsForBadgeRun(questions, badge)) {
    if (answered.has(question.id)) continue;
    return question;
  }
  return null;
}
