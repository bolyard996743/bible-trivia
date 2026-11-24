import { STORAGE_KEY } from "../storage";

/** Seen earned badges live beside the local player record. They are not a database column. */
export const BADGE_SEEN_KEY = `${STORAGE_KEY}:badge-seen`;

export type BadgeAttention = "none" | "flash" | "glow";

type SeenBook = Record<string, string[]>;

export function badgeAttention(earned: boolean, seen: boolean, reducedMotion: boolean): BadgeAttention {
  if (!earned || seen) return "none";
  return reducedMotion ? "glow" : "flash";
}

export function markBadgesSeen(seen: readonly string[], ids: readonly string[]): string[] {
  return [...new Set([...seen, ...ids])];
}

/**
 * The first saved list treats badges the player already earned as seen.
 * A badge earned after that is noticed once, then stored with the rest.
 */
export function noticePlan(
  stored: readonly string[] | null,
  earnedIds: readonly string[],
): { seen: string[]; attentionIds: string[] } {
  if (stored === null) return { seen: [...earnedIds], attentionIds: [] };
  return { seen: [...stored], attentionIds: earnedIds.filter((id) => !stored.includes(id)) };
}

function readBook(raw: string | null): SeenBook {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const book: SeenBook = {};
    for (const [key, ids] of Object.entries(value)) {
      if (!key || !Array.isArray(ids)) continue;
      book[key] = ids.filter((id): id is string => typeof id === "string" && id.length > 0);
    }
    return book;
  } catch {
    return {};
  }
}

export function hasSeenRecord(
  storage: { getItem(key: string): string | null },
  playerKey = "local",
): boolean {
  return Object.prototype.hasOwnProperty.call(readBook(storage.getItem(BADGE_SEEN_KEY)), playerKey);
}

export function readSeenBadges(
  storage: { getItem(key: string): string | null },
  playerKey = "local",
): string[] {
  return readBook(storage.getItem(BADGE_SEEN_KEY))[playerKey] ?? [];
}

export function writeSeenBadges(
  storage: { getItem(key: string): string | null; setItem(key: string, value: string): void },
  playerKey: string,
  ids: readonly string[],
): string[] {
  const book = readBook(storage.getItem(BADGE_SEEN_KEY));
  const next = markBadgesSeen(book[playerKey] ?? [], ids);
  book[playerKey] = next;
  storage.setItem(BADGE_SEEN_KEY, JSON.stringify(book));
  return next;
}

export function readSeenBadgesHere(playerKey = "local"): string[] {
  if (typeof window === "undefined") return [];
  return readSeenBadges(window.localStorage, playerKey);
}

export function writeSeenBadgesHere(playerKey: string, ids: readonly string[]): string[] {
  if (typeof window === "undefined") return [...ids];
  return writeSeenBadges(window.localStorage, playerKey, ids);
}
