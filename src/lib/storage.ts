import { mergeBestPlayerState } from "./account/player-progress";
import { earnedFirstTryIds } from "./game/badges";
import { emptyProgress, knowledgeStage } from "./game/progression";
import {
  AGE_GROUPS,
  KNOWLEDGE_PATH,
  MASCOT_IDS,
  TIERS,
  type AgeGroup,
  type AttemptState,
  type GameProgress,
  type KnowledgeStage,
  type MascotId,
  type Tier,
} from "./game/types";
import type { ProgressEvent } from "./game/progression";

export const STORAGE_KEY = "bible-trivia-v1";

export type Celebration = Exclude<ProgressEvent, { type: "mastered" }>;

export type StoredState = {
  version: 1;
  ageGroup: AgeGroup;
  mascot: MascotId;
  soundOn: boolean;
  placementComplete: boolean;
  placement: {
    cycle: number;
    tier: Tier;
    earned: number;
    possible: number;
    stage: KnowledgeStage;
  } | null;
  progress: GameProgress;
  lastVisitedOn: string | null;
  celebration: Celebration | null;
  /** Public leaderboard name. Omitted for a child. Never changed after it is set. */
  username?: string;
  /** Difficulty names on questions. Off unless the player turns them on. */
  showDifficulty?: boolean;
};

export function createState(ageGroup: AgeGroup, mascot: MascotId): StoredState {
  return {
    version: 1,
    ageGroup,
    mascot,
    soundOn: true,
    placementComplete: false,
    placement: null,
    progress: emptyProgress(),
    lastVisitedOn: null,
    celebration: null,
    showDifficulty: false,
  };
}

function isAge(value: unknown): value is AgeGroup {
  return typeof value === "string" && AGE_GROUPS.includes(value as AgeGroup);
}

function isMascot(value: unknown): value is MascotId {
  return typeof value === "string" && MASCOT_IDS.includes(value as MascotId);
}

function isTier(value: unknown): value is Tier {
  return typeof value === "string" && TIERS.includes(value as Tier);
}

function isStage(value: unknown): value is KnowledgeStage {
  return typeof value === "string" && KNOWLEDGE_PATH.includes(value as KnowledgeStage);
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function readOpenAttempt(value: GameProgress["openAttempt"]): AttemptState | null {
  if (!value || typeof value !== "object") return null;
  if (typeof value.questionId !== "string" || value.questionId.length === 0) return null;
  if (value.phase !== "asking" && value.phase !== "teaching" && value.phase !== "mastered") return null;
  const missCount = typeof value.missCount === "number" && Number.isFinite(value.missCount) ? Math.max(0, Math.floor(value.missCount)) : 0;
  if (value.phase === "asking" && missCount === 0) return null;
  return { questionId: value.questionId, missCount, phase: value.phase };
}

function isProgress(value: unknown): value is GameProgress {
  if (!value || typeof value !== "object") return false;
  const progress = value as GameProgress;
  return (
    typeof progress.cycle === "number" &&
    isTier(progress.tier) &&
    Array.isArray(progress.masteredIds) &&
    progress.masteredIds.every((id) => typeof id === "string") &&
    typeof progress.streak === "number" &&
    typeof progress.bestStreak === "number" &&
    typeof progress.seasonMasteredCount === "number"
  );
}

export function parseState(raw: string | null): StoredState | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as StoredState;
    if (value.version !== 1 || !isAge(value.ageGroup) || !isMascot(value.mascot)) return null;
    if (typeof value.soundOn !== "boolean" || typeof value.placementComplete !== "boolean") return null;
    if (!isProgress(value.progress)) return null;
    if (!isStage(value.progress.stage)) {
      value.progress.stage = knowledgeStage(value.progress.cycle, value.progress.tier);
    }
    value.progress.seasonId ??= "season-1";
    value.progress.clearedTopics = stringList(value.progress.clearedTopics);
    value.progress.clearedBooks = stringList(value.progress.clearedBooks);
    if (Array.isArray((value.progress as { firstTryIds?: unknown }).firstTryIds)) {
      value.progress.firstTryIds = stringList(value.progress.firstTryIds);
    } else {
      delete value.progress.firstTryIds;
    }
    if (!isStage(value.progress.mapOrigin)) delete value.progress.mapOrigin;
    value.progress.scoredIds = stringList(value.progress.scoredIds);
    value.progress.placementIds = stringList(value.progress.placementIds);
    value.progress.openAttempt = readOpenAttempt(value.progress.openAttempt);
    value.progress.draw ??= 0;
    value.progress.points ??= 0;
    value.showDifficulty = value.showDifficulty === true;
    if (value.placement) {
      if (
        typeof value.placement.cycle !== "number" ||
        !isTier(value.placement.tier) ||
        !isStage(value.placement.stage)
      ) {
        return null;
      }
    }
    return value;
  } catch {
    return null;
  }
}

type LocalBucket = {
  getItem(key: string): string | null;
  setItem?(key: string, value: string): void;
  removeItem?(key: string): void;
  length?: number;
  key?(index: number): string | null;
};

/** Write the badge list next to the rest of the progress so a reload can read it. */
export function withDurableBadges(state: StoredState): StoredState {
  const firstTryIds = earnedFirstTryIds(state.progress);
  const current = state.progress.firstTryIds;
  if (current && current.length === firstTryIds.length && current.every((id, index) => id === firstTryIds[index])) {
    return state;
  }
  return { ...state, progress: { ...state.progress, firstTryIds } };
}

function isLegacyProgressKey(key: string): boolean {
  return key !== STORAGE_KEY && key.startsWith(STORAGE_KEY);
}

export function legacyProgressKeys(storage: LocalBucket): string[] {
  const found = new Set<string>();
  if (typeof storage.length === "number" && typeof storage.key === "function") {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key && isLegacyProgressKey(key)) found.add(key);
    }
  }
  for (const id of MASCOT_IDS) {
    for (const key of [`${STORAGE_KEY}:${id}`, `${STORAGE_KEY}-${id}`, `${STORAGE_KEY}_${id}`]) {
      if (storage.getItem(key) != null) found.add(key);
    }
  }
  return [...found];
}

function stateFromSlot(base: Record<string, unknown>, mascot: string, slot: unknown): StoredState | null {
  const direct = parseState(JSON.stringify(slot));
  if (direct) {
    return MASCOT_IDS.includes(mascot as MascotId) ? { ...direct, mascot: mascot as MascotId } : direct;
  }
  if (!slot || typeof slot !== "object" || !MASCOT_IDS.includes(mascot as MascotId)) return null;
  const placements = base.placementByMascot;
  const placement =
    placements && typeof placements === "object" ? (placements as Record<string, unknown>)[mascot] ?? null : null;
  return parseState(
    JSON.stringify({
      version: 1,
      ageGroup: base.ageGroup,
      mascot,
      soundOn: typeof base.soundOn === "boolean" ? base.soundOn : true,
      placementComplete: placement != null || base.placementComplete === true,
      placement,
      progress: slot,
      lastVisitedOn: typeof base.lastVisitedOn === "string" ? base.lastVisitedOn : null,
      celebration: null,
    }),
  );
}

function embeddedMascotStates(raw: string | null): { present: boolean; states: StoredState[] } {
  if (!raw) return { present: false, states: [] };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { present: false, states: [] };
  }
  if (!value || typeof value !== "object") return { present: false, states: [] };
  const record = value as Record<string, unknown>;
  const buckets = [record.progressByMascot, record.byMascot];
  const present = buckets.some((bucket) => bucket != null && typeof bucket === "object") || record.placementByMascot != null;
  const states: StoredState[] = [];
  for (const bucket of buckets) {
    if (!bucket || typeof bucket !== "object") continue;
    for (const [mascot, slot] of Object.entries(bucket as Record<string, unknown>)) {
      const parsed = stateFromSlot(record, mascot, slot);
      if (parsed) states.push(parsed);
    }
  }
  return { present, states };
}

export function readLocalState(storage: LocalBucket): StoredState | null {
  const raw = storage.getItem(STORAGE_KEY);
  const current = parseState(raw);
  const embedded = embeddedMascotStates(raw);
  const keys = legacyProgressKeys(storage);
  const legacy = keys.flatMap((key) => {
    const parsed = parseState(storage.getItem(key));
    return parsed ? [parsed] : [];
  });
  if (!embedded.present && legacy.length === 0) return current;
  const merged = mergeBestPlayerState([current, ...embedded.states, ...legacy], current?.mascot);
  if (merged && storage.setItem) {
    storage.setItem(STORAGE_KEY, JSON.stringify(withDurableBadges(merged)));
  }
  if (storage.removeItem) {
    for (const key of keys) {
      if (parseState(storage.getItem(key))) storage.removeItem(key);
    }
  }
  return merged ?? current;
}

export function writeLocalState(state: StoredState, storage: { setItem(key: string, value: string): void }): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(withDurableBadges(state)));
}

export function loadState(): StoredState | null {
  if (typeof window === "undefined") return null;
  return readLocalState(window.localStorage);
}

export function saveState(state: StoredState): void {
  if (typeof window === "undefined") return;
  writeLocalState(state, window.localStorage);
  window.dispatchEvent(new Event("bible-trivia-storage"));
}

export function todayKey(date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
