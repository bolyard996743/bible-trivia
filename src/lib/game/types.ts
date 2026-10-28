export const AGE_GROUPS = ["child", "teen", "adult", "older"] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

export const TIERS = ["foundation", "intermediate", "advanced", "expert"] as const;
export type Tier = (typeof TIERS)[number];

export const TESTAMENTS = ["OT", "NT"] as const;
export type Testament = (typeof TESTAMENTS)[number];

export const MASCOT_IDS = ["judah", "agnes", "shalom", "zion", "hunter"] as const;
export type MascotId = (typeof MASCOT_IDS)[number];

export const MOMENTS = [
  "welcome",
  "mascot_selected",
  "placement_intro",
  "placement_result",
  "wrong_intro",
  "retry_prompt",
  "correct",
  "correct_after_retry",
  "streak",
  "section_complete",
  "cycle_complete",
  "level_up",
  "leaderboard_reassurance",
  "daily_return",
  "encouragement_general",
] as const;
export type Moment = (typeof MOMENTS)[number];

export const AUDIENCES = ["all", "child", "teen", "adult", "older"] as const;
export type Audience = (typeof AUDIENCES)[number];

export const KNOWLEDGE_PATH = [
  "Seed",
  "Sprout",
  "Rooted",
  "Growing",
  "Established",
  "Fruitful",
  "Deep Roots",
] as const;
export type KnowledgeStage = (typeof KNOWLEDGE_PATH)[number];

export type Wording = {
  adult: string;
  child?: string;
  teen?: string;
  older?: string;
};

export type Choice = {
  id: string;
  text: string;
};

export type Verse = {
  ref: string;
  text: string;
  translation: "NKJV";
};

export type Question = {
  id: string;
  cycle: number;
  tier: Tier;
  testament: Testament;
  book: string;
  section: string;
  topics: string[];
  placement_eligible: boolean;
  type: "multiple_choice" | "true_false";
  prompt: Wording;
  choices: Choice[];
  answer: string;
  teaching: {
    verses: Verse[];
    explanation: Wording;
    extended_explanation?: string;
    takeaway: string;
  };
  review: {
    status: "draft" | "approved";
    notes: string;
  };
};

export type MascotLine = {
  id: string;
  moment: Moment;
  audience: Audience;
  text: string;
  audio_file: string | null;
  question_id: string | null;
  mascot: MascotId;
};

export type GameProgress = {
  cycle: number;
  tier: Tier;
  masteredIds: string[];
  streak: number;
  bestStreak: number;
  /** Seasonal counter. Never feeds the Knowledge Path. */
  seasonMasteredCount: number;
};

export type AttemptPhase = "asking" | "teaching" | "mastered";

export type AttemptState = {
  questionId: string;
  missCount: number;
  phase: AttemptPhase;
};

export type PlacementAttempt = {
  questionId: string;
  tier: Tier;
  firstAttemptCorrect: boolean;
};

export type PlacementResult = {
  cycle: number;
  tier: Tier;
  earned: number;
  possible: number;
  ratio: number;
  stage: KnowledgeStage;
};

export const MASCOTS: Record<
  MascotId,
  { name: string; emoji: string; trait: string }
> = {
  judah: {
    name: "Judah the Lion",
    emoji: "🦁",
    trait: "Strength and courage",
  },
  agnes: {
    name: "Agnes the Lamb",
    emoji: "🐑",
    trait: "Gentleness and kindness",
  },
  shalom: {
    name: "Shalom the Dove",
    emoji: "🕊️",
    trait: "Peace and calm",
  },
  zion: {
    name: "Zion the Eagle",
    emoji: "🦅",
    trait: "Hope and perseverance",
  },
  hunter: {
    name: "Hunter the Great Fish",
    emoji: "🐟",
    trait: "A steady guide through deep water",
  },
};

export const AGE_LABELS: Record<AgeGroup, { title: string; detail: string }> = {
  child: { title: "Child", detail: "Simple words and the story first" },
  teen: { title: "Teen", detail: "Clear, honest, and to the point" },
  adult: { title: "Adult", detail: "The fuller picture of the passage" },
  older: { title: "Older", detail: "Steady and reflective" },
};

export const TIER_LABELS: Record<Tier, string> = {
  foundation: "Foundation",
  intermediate: "Intermediate",
  advanced: "Advanced",
  expert: "Expert",
};
