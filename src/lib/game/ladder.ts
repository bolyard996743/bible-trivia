import {
  BOOK_GATES,
  CANONICAL_BOOKS,
  GOSPELS,
  PENTATEUCH,
  SEED_BOOK_GATE,
  STAGE_TOPICS,
  TIER_MIX,
  isBookGated,
  nextStage,
  stageRank,
} from "../curriculum";
import type { GameProgress, KnowledgeStage, Question, Tier } from "./types";
import { TIERS } from "./types";

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
  if (stageOf(question) === stage) return true;
  const topics = new Set<string>(STAGE_TOPICS[stage]);
  return question.topics.some((topic) => topics.has(topic));
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
  const draw = progress.draw ?? 0;
  const reviewTurn = draw % 5 === 4;
  const earlier = questions.filter(
    (question) => mastered.has(question.id) && stageRank(stageOf(question)) < stageRank(stage),
  );
  if (reviewTurn && earlier.length > 0) {
    return { question: earlier[draw % earlier.length]!, review: true };
  }

  const fresh = questions.filter((question) => !mastered.has(question.id) && matchesStage(question, stage));
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

export function gateStatus(questions: Question[], progress: GameProgress): { ready: boolean; cleared: number; required: number } {
  const stage = progress.stage ?? "Seed";
  const clearedTopics = new Set(progress.clearedTopics ?? []);
  const clearedBooks = new Set(progress.clearedBooks ?? []);
  if (!isBookGated(stage)) {
    const topics = activeTopics(questions, stage);
    let required = topics.length;
    let cleared = topics.filter((topic) => clearedTopics.has(topic)).length;
    if (stage === "Seed") {
      const books = booksWithContent(questions, stage);
      const pentateuchAvailable = books.filter((book) => (PENTATEUCH as readonly string[]).includes(book));
      const gospelAvailable = books.filter((book) => (GOSPELS as readonly string[]).includes(book));
      if (pentateuchAvailable.length > 0) {
        required += SEED_BOOK_GATE.pentateuch;
        cleared += Math.min(
          SEED_BOOK_GATE.pentateuch,
          pentateuchAvailable.filter((book) => clearedBooks.has(book)).length,
        );
      }
      if (gospelAvailable.length > 0) {
        required += SEED_BOOK_GATE.gospels;
        cleared += Math.min(
          SEED_BOOK_GATE.gospels,
          gospelAvailable.filter((book) => clearedBooks.has(book)).length,
        );
      }
    }
    return { ready: required === 0 || cleared >= required, cleared, required };
  }
  const available = booksWithContent(questions, stage).length;
  const required = Math.min(BOOK_GATES[stage] ?? 66, available);
  const cleared = Math.min(clearedBooks.size, required);
  return { ready: required === 0 || cleared >= required, cleared, required };
}

export function recordClear(
  progress: GameProgress,
  question: Question,
  firstTry: boolean,
): GameProgress {
  const clearedTopics = new Set(progress.clearedTopics ?? []);
  const clearedBooks = new Set(progress.clearedBooks ?? []);
  if (firstTry) {
    for (const topic of question.topics) clearedTopics.add(topic);
    clearedBooks.add(question.book);
  }
  return {
    ...progress,
    clearedTopics: [...clearedTopics],
    clearedBooks: [...clearedBooks],
  };
}

export function advanceStage(questions: Question[], progress: GameProgress): GameProgress {
  const stage = progress.stage ?? "Seed";
  const status = gateStatus(questions, progress);
  if (!status.ready) return progress;
  const upcoming = nextStage(stage);
  if (!upcoming) return progress;
  return { ...progress, stage: upcoming, draw: 0 };
}

export { tierOrder };
