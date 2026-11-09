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
  "jesus-baptism",
  "disciples",
  "parables",
  "sermon-on-the-mount",
  "jesus-loves-everyone",
  "palm-sunday",
  "last-supper",
  "peter-miracles",
  "saul-paul",
  "good-news",
  "grace-strength",
  "psalms",
  "proverbs",
  "daniel-lions",
  "fiery-furnace",
  "books-of-the-bible",
] as const;

export type CurriculumTopic = (typeof CURRICULUM_TOPICS)[number];

/** Player-facing names. The checklist must not show the stored slug. */
export const TOPIC_LABELS: Record<CurriculumTopic, string> = {
  creation: "Creation",
  noah: "Noah",
  moses: "Moses",
  "david-goliath": "David and Goliath",
  jonah: "Jonah",
  "jesus-birth": "Jesus' Birth",
  miracles: "Miracles",
  "cross-resurrection": "Cross and Resurrection",
  "john-3-16-17": "John 3:16–17",
  "twelve-disciples": "The Twelve Disciples",
  "nt-books-overview": "New Testament Books",
  "isaiah-53-6": "Isaiah 53",
  "ten-commandments": "The Ten Commandments",
  "psalm-23": "Psalm 23",
  "ot-overview": "Old Testament Overview",
  "great-commission": "The Great Commission",
  "1-john-1-9": "1 John 1:9",
  "roman-road": "The Roman Road",
  "cross-references": "Cross References",
  "lords-prayer": "The Lord's Prayer",
  "psalm-1": "Psalm 1",
  "greatest-commandment": "The Greatest Commandment",
  "wisdom-books": "Wisdom Books",
  beatitudes: "The Beatitudes",
  "armor-of-god": "The Armor of God",
  "fruit-of-spirit": "The Fruit of the Spirit",
  epistles: "The Epistles",
  joseph: "Joseph",
  patriarchs: "The Patriarchs",
  "jesus-identity": "Who Jesus Is",
  pentecost: "Pentecost",
  "early-church": "The Early Church",
  daniel: "Daniel",
  revelation: "Revelation",
  ruth: "Ruth",
  "jesus-baptism": "Jesus' Baptism",
  disciples: "Jesus Chooses the Disciples",
  parables: "Parables of Jesus",
  "sermon-on-the-mount": "Sermon on the Mount",
  "jesus-loves-everyone": "Jesus Loves Everyone",
  "palm-sunday": "Palm Sunday",
  "last-supper": "The Last Supper",
  "peter-miracles": "Peter's Miracles",
  "saul-paul": "Saul Becomes Paul",
  "good-news": "Good News Verses",
  "grace-strength": "Grace and Strength Verses",
  psalms: "Psalms of Praise and Trust",
  proverbs: "Proverbs for Growing Up",
  "daniel-lions": "Daniel and the Lions' Den",
  "fiery-furnace": "The Fiery Furnace",
  "books-of-the-bible": "Books of the Bible",
};

export function topicLabel(topic: string): string {
  if (Object.prototype.hasOwnProperty.call(TOPIC_LABELS, topic)) {
    return TOPIC_LABELS[topic as CurriculumTopic];
  }
  return topic
    .split("-")
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

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
  Sprout: [
    "jesus-baptism",
    "disciples",
    "parables",
    "sermon-on-the-mount",
    "jesus-loves-everyone",
    "palm-sunday",
    "last-supper",
    "pentecost",
    "peter-miracles",
    "saul-paul",
    "good-news",
    "grace-strength",
    "psalms",
    "proverbs",
    "daniel-lions",
    "fiery-furnace",
    "books-of-the-bible",
  ],
  Rooted: ["ten-commandments", "psalm-23", "ot-overview"],
  Growing: ["great-commission", "1-john-1-9", "roman-road", "cross-references"],
  Established: ["lords-prayer", "psalm-1", "greatest-commandment", "wisdom-books"],
  Fruitful: ["beatitudes", "armor-of-god", "fruit-of-spirit", "epistles"],
  "Deep Roots": [],
};

/**
 * Share of each tier inside a stage. Weights sum to 100. A missing tier borrows the next lower one.
 * foundation = easy, intermediate = intermediate, advanced and expert = hard.
 * The age and difficulty guide that these weights follow lives in src/lib/content/gaps.ts.
 * Do not render that guide, or these tier names, to players.
 */
export const TIER_MIX: Record<KnowledgeStage, Record<Tier, number>> = {
  Seed: { foundation: 100, intermediate: 0, advanced: 0, expert: 0 },
  Sprout: { foundation: 80, intermediate: 20, advanced: 0, expert: 0 },
  Rooted: { foundation: 60, intermediate: 40, advanced: 0, expert: 0 },
  Growing: { foundation: 10, intermediate: 75, advanced: 15, expert: 0 },
  Established: { foundation: 0, intermediate: 75, advanced: 20, expert: 5 },
  Fruitful: { foundation: 0, intermediate: 40, advanced: 35, expert: 25 },
  "Deep Roots": { foundation: 0, intermediate: 10, advanced: 30, expert: 60 },
};

/** Player-facing description of the current stage. No ages and no difficulty words. */
export const STAGE_LEARNING: Record<KnowledgeStage, string> = {
  Seed: "Big Bible stories, from the beginning.",
  Sprout: "People who trusted God and got ready to follow.",
  Rooted: "Law, songs, and the church just after Jesus.",
  Growing: "More books, and how the story holds together.",
  Established: "Prayer, wisdom, and words that tie Scripture together.",
  Fruitful: "The letters, and a life that shows the Spirit's fruit.",
  "Deep Roots": "Every book of the Bible, one story at a time.",
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
