import type { GameProgress, KnowledgeStage, Question, Tier } from "./types";
import { KNOWLEDGE_PATH, TIERS } from "./types";

const BOOK_ORDER = [
  "Genesis",
  "Exodus",
  "Leviticus",
  "Numbers",
  "Deuteronomy",
  "Joshua",
  "Judges",
  "Ruth",
  "1 Samuel",
  "2 Samuel",
  "1 Kings",
  "2 Kings",
  "1 Chronicles",
  "2 Chronicles",
  "Ezra",
  "Nehemiah",
  "Esther",
  "Job",
  "Psalms",
  "Proverbs",
  "Ecclesiastes",
  "Song of Solomon",
  "Isaiah",
  "Jeremiah",
  "Lamentations",
  "Ezekiel",
  "Daniel",
  "Hosea",
  "Joel",
  "Amos",
  "Obadiah",
  "Jonah",
  "Micah",
  "Nahum",
  "Habakkuk",
  "Zephaniah",
  "Haggai",
  "Zechariah",
  "Malachi",
  "Matthew",
  "Mark",
  "Luke",
  "John",
  "Acts",
  "Romans",
  "1 Corinthians",
  "2 Corinthians",
  "Galatians",
  "Ephesians",
  "Philippians",
  "Colossians",
  "1 Thessalonians",
  "2 Thessalonians",
  "1 Timothy",
  "2 Timothy",
  "Titus",
  "Philemon",
  "Hebrews",
  "James",
  "1 Peter",
  "2 Peter",
  "1 John",
  "2 John",
  "3 John",
  "Jude",
  "Revelation",
];

function bookRank(book: string): number {
  const index = BOOK_ORDER.indexOf(book);
  return index === -1 ? BOOK_ORDER.length : index;
}

/**
 * Knowledge Path is only cycle + tier. Streak and season totals never move it.
 * Cycle 1 Foundation is Seed. Each next tier, then each next cycle, steps forward.
 * Cycle 2 Advanced and anything beyond is Deep Roots.
 */
export function knowledgeStage(cycle: number, tier: Tier): KnowledgeStage {
  const tierIndex = Math.max(0, TIERS.indexOf(tier));
  const score = (Math.max(1, cycle) - 1) * TIERS.length + tierIndex;
  return KNOWLEDGE_PATH[Math.min(score, KNOWLEDGE_PATH.length - 1)] ?? "Seed";
}

export function stageIndex(stage: KnowledgeStage): number {
  const index = KNOWLEDGE_PATH.indexOf(stage);
  return index < 0 ? 0 : index;
}

export function emptyProgress(cycle = 1, tier: Tier = "foundation"): GameProgress {
  return {
    cycle,
    tier,
    masteredIds: [],
    missCounts: {},
    streak: 0,
    bestStreak: 0,
    seasonMasteredCount: 0,
  };
}

export function questionsForPlacement(
  questions: Question[],
  cycle: number,
  tier: Tier,
): Question[] {
  return questions
    .filter((question) => question.cycle === cycle && question.tier === tier)
    .slice()
    .sort((a, b) => bookRank(a.book) - bookRank(b.book) || a.id.localeCompare(b.id));
}

export function sectionsFor(questions: Question[], cycle: number, tier: Tier): string[] {
  const sections: string[] = [];
  for (const question of questionsForPlacement(questions, cycle, tier)) {
    if (!sections.includes(question.section)) sections.push(question.section);
  }
  return sections;
}

export function currentSection(questions: Question[], progress: GameProgress): string | null {
  const sections = sectionsFor(questions, progress.cycle, progress.tier);
  for (const section of sections) {
    const open = questionsForPlacement(questions, progress.cycle, progress.tier).some(
      (question) => question.section === section && !progress.masteredIds.includes(question.id),
    );
    if (open) return section;
  }
  return sections[0] ?? null;
}

export function nextQuestion(questions: Question[], progress: GameProgress): Question | null {
  const section = currentSection(questions, progress);
  if (!section) return null;
  return (
    questionsForPlacement(questions, progress.cycle, progress.tier).find(
      (question) => question.section === section && !progress.masteredIds.includes(question.id),
    ) ?? null
  );
}

export type ProgressEvent =
  | { type: "mastered" }
  | { type: "section_complete"; section: string }
  | { type: "level_up"; from: { cycle: number; tier: Tier }; to: { cycle: number; tier: Tier } }
  | { type: "cycle_complete"; cycle: number; nextCycle: number; tier: Tier }
  | { type: "caught_up" };

function stepsAfter(cycle: number, tier: Tier): { cycle: number; tier: Tier }[] {
  const steps: { cycle: number; tier: Tier }[] = [];
  let nextCycle = cycle;
  let tierIndex = TIERS.indexOf(tier);
  for (let i = 0; i < 16; i += 1) {
    tierIndex += 1;
    if (tierIndex >= TIERS.length) {
      tierIndex = 0;
      nextCycle += 1;
    }
    const nextTier = TIERS[tierIndex];
    if (!nextTier) break;
    steps.push({ cycle: nextCycle, tier: nextTier });
  }
  return steps;
}

/**
 * Mastery moves the permanent path. A first-try correct grows the streak.
 * A miss, even if corrected afterward, sets the streak back to zero.
 * seasonMasteredCount rises on its own and is not read by knowledgeStage.
 */
export function applyMastery(
  questions: Question[],
  progress: GameProgress,
  questionId: string,
  firstAttemptCorrect: boolean,
): { progress: GameProgress; event: ProgressEvent } {
  if (progress.masteredIds.includes(questionId)) {
    return { progress, event: { type: "mastered" } };
  }
  const question = questions.find((item) => item.id === questionId);
  if (!question) {
    throw new Error(`Unknown question ${questionId}`);
  }
  if (question.cycle !== progress.cycle || question.tier !== progress.tier) {
    throw new Error("That question is not part of the current cycle and tier.");
  }

  const streak = firstAttemptCorrect ? progress.streak + 1 : 0;
  const next: GameProgress = {
    ...progress,
    masteredIds: [...progress.masteredIds, questionId],
    streak,
    bestStreak: Math.max(progress.bestStreak, streak),
    seasonMasteredCount: progress.seasonMasteredCount + 1,
  };

  const inSection = questionsForPlacement(questions, progress.cycle, progress.tier).filter(
    (item) => item.section === question.section,
  );
  const sectionDone = inSection.every((item) => next.masteredIds.includes(item.id));
  if (!sectionDone) return { progress: next, event: { type: "mastered" } };

  const sections = sectionsFor(questions, progress.cycle, progress.tier);
  const sectionIndex = sections.indexOf(question.section);
  const upcoming = sections.slice(sectionIndex + 1);
  const moreInTier = upcoming.some((section) =>
    questionsForPlacement(questions, progress.cycle, progress.tier).some(
      (item) => item.section === section && !next.masteredIds.includes(item.id),
    ),
  );
  if (moreInTier) {
    return { progress: next, event: { type: "section_complete", section: question.section } };
  }

  for (const step of stepsAfter(progress.cycle, progress.tier)) {
    const hasFresh = questions.some(
      (item) =>
        item.cycle === step.cycle &&
        item.tier === step.tier &&
        !next.masteredIds.includes(item.id),
    );
    if (!hasFresh) continue;
    const advanced: GameProgress = { ...next, cycle: step.cycle, tier: step.tier };
    if (step.cycle !== progress.cycle) {
      return {
        progress: advanced,
        event: { type: "cycle_complete", cycle: progress.cycle, nextCycle: step.cycle, tier: step.tier },
      };
    }
    return {
      progress: advanced,
      event: {
        type: "level_up",
        from: { cycle: progress.cycle, tier: progress.tier },
        to: step,
      },
    };
  }

  return { progress: next, event: { type: "caught_up" } };
}
