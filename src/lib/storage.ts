import { emptyProgress } from "./game/progression";
import {
  AGE_GROUPS,
  KNOWLEDGE_PATH,
  MASCOT_IDS,
  TIERS,
  type AgeGroup,
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

export function readLocalState(storage: { getItem(key: string): string | null }): StoredState | null {
  return parseState(storage.getItem(STORAGE_KEY));
}

export function writeLocalState(state: StoredState, storage: { setItem(key: string, value: string): void }): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
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
