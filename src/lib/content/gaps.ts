import { BOOK_GATES, CANONICAL_BOOKS, STAGE_TOPICS, TIER_MIX, topicLabel } from "../curriculum";
import type { KnowledgeStage, Question, Tier } from "../game/types";
import { KNOWLEDGE_PATH, TIERS } from "../game/types";

/**
 * Internal question-pool guide. Never render these sentences in the app.
 * foundation is easy. intermediate is intermediate. advanced and expert are hard.
 */
export const STAGE_POOL_GUIDE: Record<KnowledgeStage, string> = {
  Seed: "No Bible knowledge, about age 6. Big stories. All easy.",
  Sprout: "Considering baptism, about age 9–10. Mostly easy.",
  Rooted: "Newly baptized, about age 11–13. Easy to intermediate.",
  Growing: "Deeper study, more books. Mostly intermediate.",
  Established: "About 40 books. Intermediate, plus some hard.",
  Fruitful: "About 60 books. Intermediate to hard.",
  "Deep Roots": "All 66 books. Mostly hard.",
};

/** Approximate size of a stage pool so the tier mix can be drawn without repeating one question. */
export const STAGE_POOL_TARGET: Record<KnowledgeStage, number> = {
  Seed: 36,
  Sprout: 20,
  Rooted: 24,
  Growing: 40,
  Established: 80,
  Fruitful: 120,
  "Deep Roots": 198,
};

const TIER_WORDS: Record<Tier, string> = {
  foundation: "easy",
  intermediate: "intermediate",
  advanced: "hard",
  expert: "hard",
};

type Bucket = {
  topic: string;
  book: string;
  section: string;
  tier: Tier;
  count: number;
};

function bucketsFor(questions: Question[]): Bucket[] {
  const counts = new Map<string, Bucket>();
  for (const question of questions) {
    const topic = question.topics[0] ?? "(none)";
    const key = [topic, question.book, question.section, question.tier].join("|");
    const current = counts.get(key);
    if (current) current.count += 1;
    else counts.set(key, { topic, book: question.book, section: question.section, tier: question.tier, count: 1 });
  }
  return [...counts.values()].sort(
    (a, b) => a.book.localeCompare(b.book) || a.section.localeCompare(b.section) || a.tier.localeCompare(b.tier) || a.topic.localeCompare(b.topic),
  );
}

function tierCounts(questions: Question[]): Record<Tier, number> {
  const counts = { foundation: 0, intermediate: 0, advanced: 0, expert: 0 };
  for (const question of questions) counts[question.tier] += 1;
  return counts;
}

function wanted(stage: KnowledgeStage, tier: Tier): number {
  return Math.round((STAGE_POOL_TARGET[stage] * TIER_MIX[stage][tier]) / 100);
}

export function renderContentGapReport(questions: Question[]): string {
  const lines: string[] = [
    "# Question pool gaps",
    "",
    "Internal only. Do not show this guide, these ages, or these difficulty words to players.",
    "",
    "Selection uses `TIER_MIX` in `src/lib/curriculum.ts`. Foundation is easy, intermediate is intermediate, and advanced plus expert are hard. A rolled tier with no questions borrows the next lower tier, then any tier that still has questions. Book targets below are the pool goals. A player is not blocked by a book that has no questions yet.",
    "",
    `The bank has ${questions.length} questions.`,
    "",
  ];

  for (const stage of KNOWLEDGE_PATH) {
    const own = questions.filter((question) => question.stage === stage);
    const counts = tierCounts(own);
    const books = [...new Set(own.map((question) => question.book))].sort((a, b) => bookRank(a) - bookRank(b));
    const topics = new Set(own.flatMap((question) => question.topics));
    lines.push(`## ${stage}`);
    lines.push("");
    lines.push(STAGE_POOL_GUIDE[stage]);
    lines.push("");
    lines.push(`Questions now: ${own.length}. Books: ${books.length}. Target pool: about ${STAGE_POOL_TARGET[stage]} questions.`);
    lines.push("");
    lines.push("| Topic | Book | Section | Tier | Count |");
    lines.push("| --- | --- | --- | --- | ---: |");
    if (own.length === 0) {
      lines.push("| — | — | — | — | 0 |");
    } else {
      for (const bucket of bucketsFor(own)) {
        lines.push(`| ${topicLabel(bucket.topic)} | ${bucket.book} | ${bucket.section} | ${bucket.tier} | ${bucket.count} |`);
      }
    }
    lines.push("");
    lines.push("Tier totals against the mix:");
    lines.push("");
    for (const tier of TIERS) {
      const weight = TIER_MIX[stage][tier];
      const have = counts[tier];
      const goal = wanted(stage, tier);
      if (weight === 0 && have === 0) continue;
      const more = Math.max(0, goal - have);
      const share = weight === 0 ? "not in this stage's mix" : `${weight}% of draws (${TIER_WORDS[tier]})`;
      const next = more > 0 ? `About ${more} more.` : "Target met.";
      lines.push(`- ${tier}: ${have} now, about ${goal} wanted (${share}). ${next}`);
    }
    lines.push("");

    const outside = TIERS.filter((tier) => TIER_MIX[stage][tier] === 0 && counts[tier] > 0);
    if (outside.length > 0) {
      lines.push(
        `Questions outside the mix (${outside.map((tier) => `${counts[tier]} ${tier}`).join(", ")}) are not chosen while an allowed tier still has questions.`,
      );
      lines.push("");
    }

    const missingTopics = STAGE_TOPICS[stage].filter((topic) => !topics.has(topic));
    if (STAGE_TOPICS[stage].length > 0) {
      lines.push(
        missingTopics.length > 0
          ? `Curriculum topics with no question yet: ${missingTopics.map((topic) => topicLabel(topic)).join(", ")}.`
          : "Every curriculum topic for this stage has at least one question.",
      );
      lines.push("");
    }

    const gate = BOOK_GATES[stage];
    if (gate) {
      const missing = CANONICAL_BOOKS.filter((book) => !books.includes(book));
      lines.push(
        `Book target: ${gate}. Covered now: ${books.length}${books.length > 0 ? ` (${books.join(", ")})` : ""}. About ${Math.max(0, gate - books.length)} more books need questions.`,
      );
      if (missing.length > 0 && missing.length <= 12) {
        lines.push(`Books with none yet: ${missing.join(", ")}.`);
      }
      lines.push("");
    }

    lines.push("New questions to write:");
    lines.push("");
    lines.push(...needs(stage, own, counts, books, missingTopics));
    lines.push("");
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
}

function needs(
  stage: KnowledgeStage,
  own: Question[],
  counts: Record<Tier, number>,
  books: string[],
  missingTopics: readonly string[],
): string[] {
  const lines: string[] = [];
  for (const tier of TIERS) {
    const goal = wanted(stage, tier);
    const have = counts[tier];
    if (goal > have) lines.push(`- About ${goal - have} more ${tier} questions (${TIER_WORDS[tier]}).`);
  }
  if (missingTopics.length > 0) {
    lines.push(`- Add questions for: ${missingTopics.map((topic) => topicLabel(topic)).join(", ")}.`);
  }
  const gate = BOOK_GATES[stage];
  if (gate && books.length < gate) {
    lines.push(`- Spread new questions across about ${gate - books.length} more books (target ${gate}).`);
  }
  if (lines.length === 0) lines.push("- The current pool meets this stage's targets.");
  if (own.length === 0) lines.push("- This stage has no questions yet.");
  return lines;
}

function bookRank(book: string): number {
  const index = CANONICAL_BOOKS.indexOf(book as (typeof CANONICAL_BOOKS)[number]);
  return index === -1 ? CANONICAL_BOOKS.length : index;
}

export function contentGapSummary(questions: Question[]): string {
  return KNOWLEDGE_PATH.map((stage) => {
    const own = questions.filter((question) => question.stage === stage);
    const counts = tierCounts(own);
    const books = new Set(own.map((question) => question.book)).size;
    return `${stage}: ${own.length} questions, ${books} books (easy ${counts.foundation}, intermediate ${counts.intermediate}, hard ${counts.advanced + counts.expert}).`;
  }).join(" ");
}
