/** Shown with NKJV text when the API copyright line is missing those words. */
export const NKJV_COPYRIGHT =
  "Scripture quotations marked NKJV are taken from the New King James Version®. Copyright © 1982 by Thomas Nelson. Used by permission. All rights reserved.";

export const API_BIBLE_ATTRIBUTION = "Scripture from API.Bible";

export const MISSING_KEY_MESSAGE = "Scripture text isn't available on this copy of the app yet.";

export const SCRIPTURE_RETRY_MESSAGE = "We couldn't open this passage just now. Please try again in a little while.";

export const UNKNOWN_CHAPTER_MESSAGE = "That chapter isn't in this Bible.";

export const UNKNOWN_PASSAGE_MESSAGE = "That passage isn't in this Bible.";

/**
 * API.Bible requires any stored copy to be refreshed at least every 30 days.
 * Fourteen days stays inside that limit. The shared chapter cache uses this window.
 */
export const SCRIPTURE_CACHE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

/** Cached scripture tied to an account must be deleted within 72 hours of account deletion. */
export const ACCOUNT_SCRIPTURE_DELETE_WITHIN_MS = 72 * 60 * 60 * 1000;

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function cacheIsFresh(storedAtMs: number, nowMs: number): boolean {
  if (!Number.isFinite(storedAtMs) || !Number.isFinite(nowMs)) return false;
  if (nowMs < storedAtMs) return false;
  return nowMs - storedAtMs < SCRIPTURE_CACHE_MAX_AGE_MS;
}

export function scriptureCacheWithinLicense(): boolean {
  return SCRIPTURE_CACHE_MAX_AGE_MS <= THIRTY_DAYS_MS && SCRIPTURE_CACHE_MAX_AGE_MS > 0;
}

export function scriptureHeaders(): Record<string, string> {
  return {
    "Cache-Control": "private, no-store",
    "X-Scripture-Cache": "no-store",
  };
}

export function copyrightForDisplay(fromApi: string | null | undefined): string {
  const line = fromApi?.trim();
  if (!line) return NKJV_COPYRIGHT;
  const hasPublisher = /thomas nelson/i.test(line) && /new king james/i.test(line);
  if (hasPublisher) return line;
  return `${line} ${NKJV_COPYRIGHT}`;
}
