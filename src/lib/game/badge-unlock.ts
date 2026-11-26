import { STORAGE_KEY } from "../storage";
import { badgeEarned, mapStageRows, visibleBadges } from "./badges";
import { knowledgePath, stagePath, type KnowledgePathFile } from "./path";
import type { GameProgress } from "./types";

/** Unlock motion already shown, per player and per surface. Not a database column. */
export const BADGE_UNLOCK_KEY = `${STORAGE_KEY}:badge-unlock`;

export type UnlockSurface = "shelf" | "map";

export type UnlockPlan = {
  played: string[];
  fresh: string[];
};

type SurfaceBook = Partial<Record<UnlockSurface, string[]>>;
type UnlockBook = Record<string, SurfaceBook>;

/**
 * The first saved list treats badges the player already earned as played.
 * A badge earned after that is fresh once, then stored with the rest.
 */
export function planUnlock(stored: readonly string[] | null, earnedIds: readonly string[]): UnlockPlan {
  const earned = uniqueIds(earnedIds);
  if (stored === null) return { played: earned, fresh: [] };
  const known = uniqueIds(stored);
  return {
    played: uniqueIds([...known, ...earned]),
    fresh: earned.filter((id) => !known.includes(id)),
  };
}

/** Flip when motion is allowed. A still glow when it is reduced. */
export function unlockShelfClass(fresh: boolean, reducedMotion: boolean): string {
  if (!fresh) return "";
  return reducedMotion ? "badge-unlock-glow" : "badge-unlock-flip";
}

export type LockShakeMode = "none" | "shake" | "still";

/** Shake the next lock once. Reduced motion keeps a still mark and does not move it. */
export function lockShakeMode(isNext: boolean, reducedMotion: boolean): LockShakeMode {
  if (!isNext) return "none";
  return reducedMotion ? "still" : "shake";
}

/** The first unearned badge drawn on the stage map, in path order. */
export function nextLockedBadgeId(progress: GameProgress, path: KnowledgePathFile = knowledgePath): string | null {
  for (const row of mapStageRows(progress)) {
    const badges = visibleBadges(stagePath(row.stage, path)?.badges ?? []);
    for (const badge of badges) {
      if (!badgeEarned(progress, badge)) return badge.id;
    }
  }
  return null;
}

function uniqueIds(ids: readonly string[]): string[] {
  const next: string[] = [];
  for (const id of ids) {
    if (typeof id !== "string" || id.length === 0 || next.includes(id)) continue;
    next.push(id);
  }
  return next;
}

function readBook(raw: string | null): UnlockBook {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const book: UnlockBook = {};
    for (const [key, entry] of Object.entries(value)) {
      if (!key || !entry || typeof entry !== "object" || Array.isArray(entry)) continue;
      const surfaces = entry as Record<string, unknown>;
      const bookEntry: SurfaceBook = {};
      if (Object.prototype.hasOwnProperty.call(surfaces, "shelf")) bookEntry.shelf = uniqueIds(asIds(surfaces.shelf));
      if (Object.prototype.hasOwnProperty.call(surfaces, "map")) bookEntry.map = uniqueIds(asIds(surfaces.map));
      book[key] = bookEntry;
    }
    return book;
  } catch {
    return {};
  }
}

function asIds(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
}

export function hasUnlockRecord(
  storage: { getItem(key: string): string | null },
  playerKey: string,
  surface: UnlockSurface,
): boolean {
  const book = readBook(storage.getItem(BADGE_UNLOCK_KEY));
  const entry = book[playerKey];
  return Boolean(entry && Object.prototype.hasOwnProperty.call(entry, surface));
}

/** Null means this surface has never been saved for the player. */
export function readUnlockPlayed(
  storage: { getItem(key: string): string | null },
  playerKey: string,
  surface: UnlockSurface,
): string[] | null {
  const book = readBook(storage.getItem(BADGE_UNLOCK_KEY));
  if (!Object.prototype.hasOwnProperty.call(book, playerKey)) return null;
  const entry = book[playerKey];
  if (!entry || !Object.prototype.hasOwnProperty.call(entry, surface)) return null;
  return [...(entry[surface] ?? [])];
}

export function writeUnlockPlayed(
  storage: { getItem(key: string): string | null; setItem(key: string, value: string): void },
  playerKey: string,
  surface: UnlockSurface,
  ids: readonly string[],
): string[] {
  const book = readBook(storage.getItem(BADGE_UNLOCK_KEY));
  const entry = book[playerKey] ?? {};
  const next = uniqueIds(ids);
  entry[surface] = next;
  book[playerKey] = entry;
  storage.setItem(BADGE_UNLOCK_KEY, JSON.stringify(book));
  return next;
}
