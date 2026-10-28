import type { VerseMark } from "../bible/marks";
import { HIGHLIGHT_COLORS, type HighlightColor } from "../bible/marks";
import { emptyProgress } from "../game/progression";
import { KNOWLEDGE_PATH, MASCOT_IDS, TIERS, type GameProgress, type KnowledgeStage, type MascotId, type Tier } from "../game/types";
import type { StoredState } from "../storage";
import type { AccountAgeGroup } from "./policy";

export type ProfileRow = {
  user_id: string;
  age_group: AccountAgeGroup;
  mascot: MascotId;
  sound_on: boolean;
  placement_complete: boolean;
  placement_cycle: number | null;
  placement_tier: Tier | null;
  placement_earned: number | null;
  placement_possible: number | null;
  placement_stage: string | null;
  cycle: number;
  tier: Tier;
  streak: number;
  best_streak: number;
  season_mastered_count: number;
  last_visited_on: string | null;
};

export type QuestionRow = {
  user_id: string;
  question_id: string;
  miss_count: number;
  mastered: boolean;
};

export type VerseMarkRow = {
  user_id: string;
  id: string;
  book_id: string;
  chapter: number;
  verse_start: number;
  verse_end: number;
  color: HighlightColor | null;
  note: string;
  created_at: string;
  updated_at: string;
};

function isTier(value: unknown): value is Tier {
  return typeof value === "string" && TIERS.includes(value as Tier);
}

function isMascot(value: unknown): value is MascotId {
  return typeof value === "string" && MASCOT_IDS.includes(value as MascotId);
}

function isAccountAge(value: unknown): value is AccountAgeGroup {
  return value === "teen" || value === "adult" || value === "older";
}

function isStage(value: unknown): value is KnowledgeStage {
  return typeof value === "string" && KNOWLEDGE_PATH.includes(value as KnowledgeStage);
}

export function profileToRow(userId: string, state: StoredState): ProfileRow {
  if (!isAccountAge(state.ageGroup)) {
    throw new Error("Children cannot have accounts.");
  }
  return {
    user_id: userId,
    age_group: state.ageGroup,
    mascot: state.mascot,
    sound_on: state.soundOn,
    placement_complete: state.placementComplete,
    placement_cycle: state.placement?.cycle ?? null,
    placement_tier: state.placement?.tier ?? null,
    placement_earned: state.placement?.earned ?? null,
    placement_possible: state.placement?.possible ?? null,
    placement_stage: state.placement?.stage ?? null,
    cycle: state.progress.cycle,
    tier: state.progress.tier,
    streak: state.progress.streak,
    best_streak: state.progress.bestStreak,
    season_mastered_count: state.progress.seasonMasteredCount,
    last_visited_on: state.lastVisitedOn,
  };
}

export function rowToState(row: ProfileRow, questions: QuestionRow[]): StoredState | null {
  if (!isAccountAge(row.age_group) || !isMascot(row.mascot) || !isTier(row.tier)) return null;
  const masteredIds = questions.filter((question) => question.mastered).map((question) => question.question_id);
  const missCounts: Record<string, number> = {};
  for (const question of questions) {
    if (question.miss_count > 0) missCounts[question.question_id] = question.miss_count;
  }
  const progress: GameProgress = {
    ...emptyProgress(row.cycle, row.tier),
    masteredIds,
    missCounts,
    streak: row.streak,
    bestStreak: row.best_streak,
    seasonMasteredCount: row.season_mastered_count,
  };
  const placement =
    row.placement_cycle != null && isTier(row.placement_tier) && isStage(row.placement_stage)
      ? {
          cycle: row.placement_cycle,
          tier: row.placement_tier,
          earned: row.placement_earned ?? 0,
          possible: row.placement_possible ?? 0,
          stage: row.placement_stage,
        }
      : null;
  return {
    version: 1,
    ageGroup: row.age_group,
    mascot: row.mascot,
    soundOn: row.sound_on,
    placementComplete: row.placement_complete,
    placement,
    progress,
    lastVisitedOn: row.last_visited_on,
    celebration: null,
  };
}

export function questionsToRows(userId: string, progress: GameProgress): QuestionRow[] {
  const ids = new Set([...progress.masteredIds, ...Object.keys(progress.missCounts ?? {})]);
  return [...ids].map((questionId) => ({
    user_id: userId,
    question_id: questionId,
    miss_count: progress.missCounts?.[questionId] ?? 0,
    mastered: progress.masteredIds.includes(questionId),
  }));
}

export function markToRow(userId: string, mark: VerseMark): VerseMarkRow {
  return {
    user_id: userId,
    id: mark.id,
    book_id: mark.bookId,
    chapter: mark.chapter,
    verse_start: mark.verseStart,
    verse_end: mark.verseEnd,
    color: mark.color,
    note: mark.note,
    created_at: mark.createdAt,
    updated_at: mark.updatedAt,
  };
}

export function rowToMark(row: VerseMarkRow): VerseMark | null {
  if (row.color != null && !HIGHLIGHT_COLORS.includes(row.color)) return null;
  return {
    id: row.id,
    bookId: row.book_id,
    chapter: row.chapter,
    verseStart: row.verse_start,
    verseEnd: row.verse_end,
    color: row.color,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const VERSE_MARK_COLUMNS = [
  "user_id",
  "id",
  "book_id",
  "chapter",
  "verse_start",
  "verse_end",
  "color",
  "note",
  "created_at",
  "updated_at",
] as const;

export function assertReferenceOnly(row: Record<string, unknown>) {
  for (const key of Object.keys(row)) {
    if (!VERSE_MARK_COLUMNS.includes(key as (typeof VERSE_MARK_COLUMNS)[number])) {
      throw new Error("Verse wording cannot be stored on an account.");
    }
  }
}
