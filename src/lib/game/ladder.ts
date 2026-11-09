import {
  BOOK_SECTIONS,
  CANONICAL_BOOKS,
  STAGE_TOPICS,
  TIER_MIX,
  isBookGated,
  nextStage,
  stageRank,
  topicLabel,
} from "../curriculum";
import { earnedFirstTryIds, gateFromBadges } from "./badges";
import type { GameProgress, KnowledgeStage, Question, Tier } from "./types";
import { TIER_LABELS, TIERS } from "./types";

export type LadderPick = {
  question: Question;
  review: boolean;
};

export function attemptPoints(missCount: number, review: boolean, alreadyScored: boolean): number {
  if (review || alreadyScored) return 0;
  if (missCount <= 0) return 10;
  if (missCount === 1) return 5;
  return 2;
}

function bookIndex(book: string): number {
  const index = CANONICAL_BOOKS.indexOf(book as (typeof CANONICAL_BOOKS)[number]);
  return index === -1 ? CANONICAL_BOOKS.length : index;
}

function stageOf(question: Question): KnowledgeStage {
  return question.stage ?? "Seed";
}

export function questionsForStage(questions: Question[], stage: KnowledgeStage): Question[] {
  const rank = stageRank(stage);
  return questions.filter((question) => stageRank(stageOf(question)) <= rank);
}

export function activeTopics(questions: Question[], stage: KnowledgeStage): string[] {
  const available = new Set(
    questionsForStage(questions, stage).flatMap((question) => question.topics),
  );
  return STAGE_TOPICS[stage].filter((topic) => available.has(topic));
}

export function booksWithContent(questions: Question[], stage: KnowledgeStage): string[] {
  const names = new Set(questionsForStage(questions, stage).map((question) => question.book));
  return CANONICAL_BOOKS.filter((book) => names.has(book));
}

function tierOrder(stage: KnowledgeStage): Tier[] {
  const mix = TIER_MIX[stage];
  return TIERS.filter((tier) => mix[tier] > 0);
}

/** Pick a tier from the stage mix. `roll` is 0–99. Empty tiers borrow the next lower tier. */
export function tierForRoll(stage: KnowledgeStage, roll: number, available: Set<Tier>): Tier | null {
  const mix = TIER_MIX[stage];
  const clamped = Math.min(99, Math.max(0, Math.floor(roll)));
  let cursor = 0;
  let chosen: Tier = "foundation";
  for (const tier of TIERS) {
    const weight = mix[tier];
    if (weight <= 0) continue;
    cursor += weight;
    chosen = tier;
    if (clamped < cursor) break;
  }
  if (available.has(chosen)) return chosen;
  const start = TIERS.indexOf(chosen);
  for (let index = start - 1; index >= 0; index -= 1) {
    const lower = TIERS[index];
    if (lower && available.has(lower)) return lower;
  }
  for (const tier of TIERS) {
    if (available.has(tier)) return tier;
  }
  return null;
}

function matchesStage(question: Question, stage: KnowledgeStage): boolean {
  // A question's stage is the earliest point it may appear. Later questions stay locked.
  if (stageRank(stageOf(question)) > stageRank(stage)) return false;
  if (stageOf(question) === stage) return true;
  const topics = new Set<string>(STAGE_TOPICS[stage]);
  return question.topics.some((topic) => topics.has(topic));
}

function excludedIds(progress: GameProgress): Set<string> {
  return new Set(progress.placementIds ?? []);
}

export function nextOpenBook(questions: Question[], progress: GameProgress): string | null {
  const cleared = new Set(progress.clearedBooks ?? []);
  const stage = progress.stage ?? "Seed";
  for (const book of booksWithContent(questions, stage)) {
    if (!cleared.has(book)) return book;
  }
  return null;
}

export function selectLadderQuestion(questions: Question[], progress: GameProgress): LadderPick | null {
  const stage = progress.stage ?? "Seed";
  const mastered = new Set(progress.masteredIds);
  const placed = excludedIds(progress);
  const draw = progress.draw ?? 0;
  const reviewTurn = draw % 5 === 4;
  const reviewPool = questions.filter(
    (question) =>
      mastered.has(question.id) &&
      !placed.has(question.id) &&
      stageRank(stageOf(question)) <= stageRank(stage),
  );
  if (reviewTurn && reviewPool.length > 0) {
    return { question: reviewPool[draw % reviewPool.length]!, review: true };
  }

  const fresh = questions.filter(
    (question) => !mastered.has(question.id) && !placed.has(question.id) && matchesStage(question, stage),
  );
  const book = isBookGated(stage) ? nextOpenBook(questions, progress) : null;
  const scoped = book ? fresh.filter((question) => question.book === book) : fresh;
  const pool = scoped.length > 0 ? scoped : fresh;
  if (pool.length === 0) return null;
  const available = new Set(pool.map((question) => question.tier));
  const tier = tierForRoll(stage, (draw * 17) % 100, available);
  const tierPool = pool.filter((question) => question.tier === tier);
  const chosen = (tierPool.length > 0 ? tierPool : pool).slice().sort((a, b) => bookIndex(a.book) - bookIndex(b.book) || a.id.localeCompare(b.id));
  return { question: chosen[0]!, review: false };
}

export function gateStatus(_questions: Question[], progress: GameProgress): { ready: boolean; cleared: number; required: number } {
  return gateFromBadges(progress);
}

export type ChecklistItem = {
  id: string;
  label: string;
  state: "cleared" | "open" | "coming-soon";
};

export function stageChecklist(questions: Question[], progress: GameProgress): ChecklistItem[] {
  const stage = progress.stage ?? "Seed";
  const clearedTopics = new Set(progress.clearedTopics ?? []);
  const clearedBooks = new Set(progress.clearedBooks ?? []);
  if (isBookGated(stage)) {
    const live = new Set(booksWithContent(questions, stage));
    return BOOK_SECTIONS.flatMap((section) =>
      section.books.map((book) => ({
        id: book,
        label: book,
        state: !live.has(book) ? "coming-soon" : clearedBooks.has(book) ? "cleared" : "open",
      })),
    );
  }
  const live = new Set(activeTopics(questions, stage));
  return STAGE_TOPICS[stage].map((topic) => ({
    id: topic,
    label: topicLabel(topic),
    state: !live.has(topic) ? "coming-soon" : clearedTopics.has(topic) ? "cleared" : "open",
  }));
}

export function questionMarkers(input: {
  review: boolean;
  tier: Tier;
  showDifficulty: boolean;
}): { review: string | null; difficulty: string | null } {
  return {
    review: input.review ? "Review" : null,
    difficulty: input.showDifficulty ? TIER_LABELS[input.tier] : null,
  };
}

function knownFirstTries(progress: GameProgress): string[] {
  return earnedFirstTryIds(progress);
}

export function recordClear(
  progress: GameProgress,
  question: Question,
  firstTry: boolean,
): GameProgress {
  const clearedTopics = new Set(progress.clearedTopics ?? []);
  const clearedBooks = new Set(progress.clearedBooks ?? []);
  const firstTryIds = new Set(knownFirstTries(progress));
  if (firstTry) {
    for (const topic of question.topics) clearedTopics.add(topic);
    clearedBooks.add(question.book);
    firstTryIds.add(question.id);
  }
  return {
    ...progress,
    clearedTopics: [...clearedTopics],
    clearedBooks: [...clearedBooks],
    firstTryIds: [...firstTryIds],
  };
}

export function advanceStage(questions: Question[], progress: GameProgress): GameProgress {
  const stage = progress.stage ?? "Seed";
  const status = gateStatus(questions, progress);
  if (!status.ready) return progress;
  const upcoming = nextStage(stage);
  if (!upcoming) return progress;
  return { ...progress, stage: upcoming, mapOrigin: progress.mapOrigin ?? stage, draw: 0 };
}

export { tierOrder };
