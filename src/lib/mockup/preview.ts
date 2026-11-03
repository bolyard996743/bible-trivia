import {
  AGE_GROUPS,
  AGE_LABELS,
  KNOWLEDGE_PATH,
  MASCOT_IDS,
  MASCOTS,
  type AgeGroup,
  type KnowledgeStage,
  type MascotId,
} from "@/lib/game/types";

export const PLAYER_STATES = ["new", "progressed"] as const;
export type PlayerState = (typeof PLAYER_STATES)[number];

export type MockupPreview = {
  mascot: MascotId;
  player: PlayerState;
  demographic: AgeGroup;
};

export const MOCKUP_TABS = [
  { id: "home", href: "/mockup/home", label: "Home" },
  { id: "path", href: "/mockup/path", label: "Path" },
  { id: "collection", href: "/mockup/collection", label: "Collection" },
  { id: "groups", href: "/mockup/groups", label: "Groups" },
] as const;

export type TabId = (typeof MOCKUP_TABS)[number]["id"];

const MASCOT_SET = new Set<string>(MASCOT_IDS);
const PLAYER_SET = new Set<string>(PLAYER_STATES);
const AGE_SET = new Set<string>(AGE_GROUPS);

export function parsePreview(source: { get(name: string): string | null }): MockupPreview {
  const mascot = source.get("mascot");
  const player = source.get("player");
  const demographic = source.get("demo");
  return {
    mascot: mascot && MASCOT_SET.has(mascot) ? (mascot as MascotId) : "judah",
    player: player && PLAYER_SET.has(player) ? (player as PlayerState) : "new",
    demographic: demographic && AGE_SET.has(demographic) ? (demographic as AgeGroup) : "adult",
  };
}

export function previewQuery(preview: MockupPreview): string {
  return new URLSearchParams({
    mascot: preview.mascot,
    player: preview.player,
    demo: preview.demographic,
  }).toString();
}

export function withPreview(href: string, preview: MockupPreview): string {
  return `${href}?${previewQuery(preview)}`;
}

export function visibleTabs(player: PlayerState): TabId[] {
  if (player === "new") return ["home", "path"];
  return ["home", "path", "collection", "groups"];
}

export function tabFromPath(pathname: string): TabId | "play" | null {
  if (pathname === "/mockup/play" || pathname.startsWith("/mockup/play/")) return "play";
  const match = MOCKUP_TABS.find((tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`));
  return match?.id ?? null;
}

export function currentStage(player: PlayerState): KnowledgeStage {
  return player === "new" ? "Seed" : "Growing";
}

export type StageStatus = "done" | "here" | "ahead";

export function stageStatuses(player: PlayerState): { name: KnowledgeStage; status: StageStatus }[] {
  const here = KNOWLEDGE_PATH.indexOf(currentStage(player));
  return KNOWLEDGE_PATH.map((name, index) => ({
    name,
    status: index < here ? "done" : index === here ? "here" : "ahead",
  }));
}

export function playerLabel(player: PlayerState): string {
  return player === "new" ? "New player" : "Progressed player";
}

export function demographicLabel(demographic: AgeGroup): string {
  return AGE_LABELS[demographic].title;
}

const GUIDE_LINES: Record<MascotId, string> = {
  judah: "Courage for the next step.",
  agnes: "A gentle step still counts.",
  shalom: "Peace for this one verse.",
  zion: "Keep your eyes on the path ahead.",
  hunter: "Steady through the deep parts.",
};

export function guideLine(mascot: MascotId): string {
  return GUIDE_LINES[mascot];
}

export function guideName(mascot: MascotId): string {
  return MASCOTS[mascot].name;
}

export function homeCopy(preview: MockupPreview): { kicker: string; title: string; body: string } {
  const guide = guideName(preview.mascot);
  if (preview.player === "new") {
    const title =
      preview.demographic === "child"
        ? "Time to begin"
        : preview.demographic === "teen"
          ? "Your path starts here"
          : preview.demographic === "older"
            ? "Welcome. We begin at Seed."
            : "A first step on the path";
    return {
      kicker: "New player · example",
      title,
      body: `${guide} is with you at Seed. This example has no saved progress.`,
    };
  }
  const title =
    preview.demographic === "child"
      ? "Welcome back"
      : preview.demographic === "teen"
        ? "You are on Growing"
        : preview.demographic === "older"
          ? "The path continues"
          : "Pick up where you left off";
  return {
    kicker: "Progressed player · example",
    title,
    body: `${guide} walks with you at Growing. The streak, shelf, and group below are examples.`,
  };
}

export type BadgeArt =
  | "sun"
  | "rainbow"
  | "bush"
  | "stone"
  | "fish"
  | "star"
  | "waves"
  | "cross"
  | "heart"
  | "people"
  | "book"
  | "lamb"
  | "tablets"
  | "sheep"
  | "scroll"
  | "path"
  | "lamp"
  | "road"
  | "pages";

const STAGE_LEARNING: Record<KnowledgeStage, string> = {
  Seed: "The first stories, from the beginning through the cross.",
  Sprout: "The people and writings that carry those stories on.",
  Rooted: "Law, a shepherd psalm, and the Old Testament as a whole.",
  Growing: "Sharing the good news and finding your way through it.",
  Established: "Prayers and wisdom for a settled faith.",
  Fruitful: "A life that shows what it has learned.",
  "Deep Roots": "Scripture held deeply, across the whole Bible.",
};

const STAGE_SECTIONS: Record<KnowledgeStage, { id: string; art: BadgeArt }[]> = {
  Seed: [
    { id: "creation", art: "sun" },
    { id: "noah", art: "rainbow" },
    { id: "moses", art: "bush" },
    { id: "david", art: "stone" },
    { id: "jonah", art: "fish" },
    { id: "jesus-birth", art: "star" },
    { id: "miracles", art: "waves" },
    { id: "cross-resurrection", art: "cross" },
    { id: "john-3-16-17", art: "heart" },
  ],
  Sprout: [
    { id: "twelve-disciples", art: "people" },
    { id: "nt-books-overview", art: "book" },
    { id: "isaiah-53-6", art: "lamb" },
  ],
  Rooted: [
    { id: "ten-commandments", art: "tablets" },
    { id: "psalm-23", art: "sheep" },
    { id: "ot-overview", art: "scroll" },
  ],
  Growing: [
    { id: "great-commission", art: "path" },
    { id: "1-john-1-9", art: "lamp" },
    { id: "roman-road", art: "road" },
    { id: "cross-references", art: "pages" },
  ],
  Established: [
    { id: "lords-prayer", art: "scroll" },
    { id: "psalm-1", art: "path" },
    { id: "greatest-commandment", art: "heart" },
    { id: "wisdom-books", art: "book" },
  ],
  Fruitful: [
    { id: "beatitudes", art: "path" },
    { id: "armor-of-god", art: "stone" },
    { id: "fruit-of-spirit", art: "bush" },
    { id: "epistles", art: "scroll" },
  ],
  "Deep Roots": [],
};

export type PathBadge = {
  id: string;
  art: BadgeArt;
  filled: boolean;
};

export type PathBlock = {
  stage: KnowledgeStage;
  learning: string;
  complete: boolean;
  badges: PathBadge[];
};

/** Stages the example player has reached, oldest earned first, current last. Later stages are omitted. */
export function pathBlocks(player: PlayerState): PathBlock[] {
  const hereIndex = KNOWLEDGE_PATH.indexOf(currentStage(player));
  return KNOWLEDGE_PATH.slice(0, hereIndex + 1).map((stage, index) => {
    const complete = index < hereIndex;
    const sections = STAGE_SECTIONS[stage];
    const filledCount = complete ? sections.length : player === "new" ? 0 : Math.floor(sections.length / 2);
    return {
      stage,
      learning: STAGE_LEARNING[stage],
      complete,
      badges: sections.map((section, sectionIndex) => ({
        id: section.id,
        art: section.art,
        filled: sectionIndex < filledCount,
      })),
    };
  });
}

export type CollectionItem = {
  id: string;
  kind: "Verse" | "Stage" | "Open";
  title: string;
  detail: string;
  body?: string;
};

export const COLLECTION_ITEMS: CollectionItem[] = [
  {
    id: "john-3-16",
    kind: "Verse",
    title: "John 3:16",
    detail: "Example · remembered",
    body: "For God so loved the world that He gave His only begotten Son, that whoever believes in Him should not perish but have everlasting life.",
  },
  {
    id: "psalm-119-105",
    kind: "Verse",
    title: "Psalm 119:105",
    detail: "Example · remembered",
    body: "Your word is a lamp to my feet And a light to my path.",
  },
  {
    id: "genesis-1-1",
    kind: "Verse",
    title: "Genesis 1:1",
    detail: "Example · remembered",
    body: "In the beginning God created the heavens and the earth.",
  },
  { id: "seed", kind: "Stage", title: "Seed", detail: "Example mark" },
  { id: "sprout", kind: "Stage", title: "Sprout", detail: "Example mark" },
  { id: "rooted", kind: "Stage", title: "Rooted", detail: "Example mark" },
  { id: "ahead", kind: "Open", title: "Not collected yet", detail: "Example · still ahead" },
];

export const EXAMPLE_GROUP = {
  name: "Example family",
  week: "Read John 3:16 together this week.",
  members: [
    { id: "you", name: "Example player", role: "You" },
    { id: "teen", name: "Example teen", role: "Member" },
    { id: "child", name: "Example child", role: "Member" },
  ],
};

export const REVIEW_QUESTION = {
  ref: "John 3:16",
  translation: "NKJV" as const,
  verse:
    "For God so loved the world that He gave His only begotten Son, that whoever believes in Him should not perish but have everlasting life.",
  choices: [
    { id: "a", text: "His only begotten Son" },
    { id: "b", text: "A mighty angel" },
    { id: "c", text: "The city of Jerusalem" },
    { id: "d", text: "A golden temple" },
  ],
  answerId: "a",
  takeaway: "God gave His only begotten Son.",
  hint: "John 3:16 says God loved the world and gave someone. Read who that gift is.",
};

export function reviewPrompt(demographic: AgeGroup): string {
  switch (demographic) {
    case "child":
      return "In John 3:16, who did God give because He loved the world?";
    case "teen":
      return "John 3:16 says God loved the world and gave someone. Who?";
    case "older":
      return "When John 3:16 speaks of God's love for the world, whom did God give?";
    default:
      return "In John 3:16, whom did God give because He loved the world?";
  }
}

export const MEMORY_VERSE = {
  ref: "Psalm 119:105",
  translation: "NKJV" as const,
  before: "Your word is a",
  answer: "lamp",
  after: "to my feet And a light to my path.",
  bank: ["lamp", "sword", "crown", "river"],
};

export function memoryInstruction(demographic: AgeGroup): string {
  switch (demographic) {
    case "child":
      return "Tap the missing word.";
    case "teen":
      return "Fill in the blank from the verse.";
    case "older":
      return "Supply the word this verse is missing.";
    default:
      return "Complete the memory verse.";
  }
}
