import { CANONICAL_BOOKS, nextStage, stageRank, STAGES } from "../curriculum";
import type { GameProgress, KnowledgeStage, Question } from "./types";

function bookOrder(book: string): number {
  const index = CANONICAL_BOOKS.indexOf(book as (typeof CANONICAL_BOOKS)[number]);
  return index === -1 ? CANONICAL_BOOKS.length : index;
}

export function sectionSlug(section: string): string {
  return section
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function stageSlug(stage: string): string {
  return sectionSlug(stage);
}

/** Older saves did not store first-try ids. A mastered question with no misses counts. */
export function passedFirstTry(progress: GameProgress, questionId: string): boolean {
  if (progress.firstTryIds) return progress.firstTryIds.includes(questionId);
  return progress.masteredIds.includes(questionId) && (progress.missCounts?.[questionId] ?? 0) === 0;
}

export function questionsInSection(questions: Question[], stage: KnowledgeStage, section: string): Question[] {
  return questions.filter((question) => (question.stage ?? "Seed") === stage && question.section === section);
}

/** Sections that have questions written for this stage, in Bible order. */
export function stageSections(questions: Question[], stage: KnowledgeStage): string[] {
  const own = questions
    .filter((question) => (question.stage ?? "Seed") === stage)
    .slice()
    .sort((a, b) => bookOrder(a.book) - bookOrder(b.book) || a.section.localeCompare(b.section) || a.id.localeCompare(b.id));
  const sections: string[] = [];
  for (const question of own) {
    if (!sections.includes(question.section)) sections.push(question.section);
  }
  return sections;
}

export function sectionEarned(questions: Question[], progress: GameProgress, stage: KnowledgeStage, section: string): boolean {
  const group = questionsInSection(questions, stage, section);
  return group.length > 0 && group.every((question) => passedFirstTry(progress, question.id));
}

/**
 * A stage opens the next one when every section badge is earned.
 * A section whose questions are all finished, but not on the first try, stays an empty
 * slot and does not block. Those questions are not asked again, so the badge cannot be earned later.
 */
export function gateFromSections(
  questions: Question[],
  progress: GameProgress,
): { ready: boolean; cleared: number; required: number } {
  const stage = progress.stage ?? "Seed";
  const mastered = new Set(progress.masteredIds);
  const sections = stageSections(questions, stage);
  if (sections.length === 0) return { ready: true, cleared: 0, required: 0 };
  let cleared = 0;
  let required = 0;
  for (const section of sections) {
    const group = questionsInSection(questions, stage, section);
    if (sectionEarned(questions, progress, stage, section)) {
      required += 1;
      cleared += 1;
      continue;
    }
    const stillOpen = group.some((question) => !mastered.has(question.id));
    if (stillOpen) required += 1;
  }
  return { ready: required === 0 || cleared >= required, cleared, required };
}

/** Earned stages stay above. The current stage is last. The next stage appears only once this one is done. */
export function visibleMapStages(questions: Question[], progress: GameProgress): KnowledgeStage[] {
  const current = progress.stage ?? "Seed";
  const origin = progress.mapOrigin ?? current;
  const start = Math.min(stageRank(origin), stageRank(current));
  let end = stageRank(current);
  if (gateFromSections(questions, progress).ready) {
    const upcoming = nextStage(current);
    if (upcoming) end = Math.max(end, stageRank(upcoming));
  }
  return STAGES.filter((_, index) => index >= start && index <= end);
}
