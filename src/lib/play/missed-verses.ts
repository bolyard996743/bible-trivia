import { parseReference } from "../bible/books";
import { STORAGE_KEY } from "../storage";

/** Verse references shown after a miss. The question, choices, and answer are never stored. */
export const MISSED_VERSES_KEY = `${STORAGE_KEY}:missed-verses`;

/** A reference the app can fetch. Anything else, including a question, is dropped. */
export function verseReference(value: string): string | null {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed || trimmed.length > 48) return null;
  const parsed = parseReference(trimmed);
  if (!parsed) return null;
  return trimmed;
}

/**
 * Newest miss first. A reference already saved moves to the front.
 * Strings that are not verse references are ignored.
 */
export function addMissedVerses(existing: readonly string[], refs: readonly string[]): string[] {
  const incoming: string[] = [];
  for (const ref of refs) {
    const clean = verseReference(ref);
    if (!clean || incoming.includes(clean)) continue;
    incoming.push(clean);
  }
  const kept = existing
    .map((ref) => verseReference(ref))
    .filter((ref): ref is string => Boolean(ref && !incoming.includes(ref)));
  return [...incoming, ...kept];
}

export function readMissedVerses(storage: { getItem(key: string): string | null }): string[] {
  const raw = storage.getItem(MISSED_VERSES_KEY);
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    return addMissedVerses([], value.filter((item): item is string => typeof item === "string"));
  } catch {
    return [];
  }
}

export function writeMissedVerses(
  storage: { getItem(key: string): string | null; setItem(key: string, value: string): void },
  refs: readonly string[],
): string[] {
  const next = addMissedVerses(readMissedVerses(storage), refs);
  storage.setItem(MISSED_VERSES_KEY, JSON.stringify(next));
  return next;
}

export function rememberMissedVersesHere(refs: readonly string[]): string[] {
  if (typeof window === "undefined") return [];
  return writeMissedVerses(window.localStorage, refs);
}
