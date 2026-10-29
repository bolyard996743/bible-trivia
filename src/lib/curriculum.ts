import type { KnowledgeStage, Tier } from "./game/types";
import { KNOWLEDGE_PATH } from "./game/types";

/** Topics a question may use. A tag outside this list fails the content check. */
export const CURRICULUM_TOPICS = [
  "creation",
  "noah",
  "moses",
  "david-goliath",
  "jonah",
  "jesus-birth",
  "miracles",
  "cross-resurrection",
  "john-3-16-17",
  "twelve-disciples",
  "nt-books-overview",
  "isaiah-53-6",
  "ten-commandments",
  "psalm-23",
  "ot-overview",
  "great-commission",
  "1-john-1-9",
  "roman-road",
  "cross-references",
  "lords-prayer",
  "psalm-1",
  "greatest-commandment",
  "wisdom-books",
  "beatitudes",
  "armor-of-god",
  "fruit-of-spirit",
  "epistles",
  "joseph",
  "patriarchs",
  "jesus-identity",
  "pentecost",
  "early-church",
  "daniel",
  "revelation",
  "ruth",
] as const;

export type CurriculumTopic = (typeof CURRICULUM_TOPICS)[number];

export const STAGES = KNOWLEDGE_PATH;

export const STAGE_TOPICS: Record<KnowledgeStage, readonly CurriculumTopic[]> = {
  Seed: [
    "creation",
    "noah",
    "moses",
    "david-goliath",
    "jonah",
    "jesus-birth",
    "miracles",
    "cross-resurrection",
    "john-3-16-17",
  ],
  Sprout: ["twelve-disciples", "nt-books-overview", "isaiah-53-6"],
  Rooted: ["ten-commandments", "psalm-23", "ot-overview"],
  Growing: ["great-commission", "1-john-1-9", "roman-road", "cross-references"],
  Established: ["lords-prayer", "psalm-1", "greatest-commandment", "wisdom-books"],
  Fruitful: ["beatitudes", "armor-of-god", "fruit-of-spirit", "epistles"],
  "Deep Roots": [],
};

/** Share of each tier inside a stage. A missing tier borrows the next lower one. */
export const TIER_MIX: Record<KnowledgeStage, Record<Tier, number>> = {
  Seed: { foundation: 100, intermediate: 0, advanced: 0, expert: 0 },
  Sprout: { foundation: 80, intermediate: 20, advanced: 0, expert: 0 },
  Rooted: { foundation: 50, intermediate: 40, advanced: 10, expert: 0 },
  Growing: { foundation: 25, intermediate: 45, advanced: 25, expert: 5 },
  Established: { foundation: 10, intermediate: 30, advanced: 45, expert: 15 },
  Fruitful: { foundation: 5, intermediate: 20, advanced: 40, expert: 35 },
  "Deep Roots": { foundation: 0, intermediate: 10, advanced: 35, expert: 55 },
};

/** How many distinct books must be cleared. Topics and books with no content do not block. */
export const BOOK_GATES: Partial<Record<KnowledgeStage, number>> = {
  Growing: 20,
  Established: 40,
  Fruitful: 60,
  "Deep Roots": 66,
};

/** Seed also asks for one Pentateuch book and one Gospel, once those questions exist. */
export const SEED_BOOK_GATE = { pentateuch: 1, gospels: 1 } as const;

export const PENTATEUCH = ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy"] as const;
export const GOSPELS = ["Matthew", "Mark", "Luke", "John"] as const;

export const BOOK_SECTIONS = [
  { id: "law", label: "Law", books: ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy"] },
  {
    id: "history",
    label: "History",
    books: [
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
    ],
  },
  { id: "poetry", label: "Poetry", books: ["Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon"] },
  {
    id: "prophets",
    label: "Prophets",
    books: [
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
    ],
  },
  { id: "gospels", label: "Gospels", books: ["Matthew", "Mark", "Luke", "John"] },
  {
    id: "letters",
    label: "Letters",
    books: [
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
    ],
  },
  { id: "revelation", label: "Revelation", books: ["Revelation"] },
] as const;

export const CANONICAL_BOOKS = BOOK_SECTIONS.flatMap((section) => [...section.books]);

export const DEFAULT_SEASON = "season-1";

export function stageRank(stage: KnowledgeStage): number {
  return STAGES.indexOf(stage);
}

export function nextStage(stage: KnowledgeStage): KnowledgeStage | null {
  const index = stageRank(stage);
  return STAGES[index + 1] ?? null;
}

export function isBookGated(stage: KnowledgeStage): boolean {
  return stageRank(stage) >= stageRank("Growing");
}
