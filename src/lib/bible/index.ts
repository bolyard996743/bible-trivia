import { placeholderBibleProvider } from "./placeholder";
import type { BibleProvider } from "./types";

export type { BibleBookSummary, BibleChapter, BiblePassage, BibleProvider, BibleVerse } from "./types";

/**
 * The only place that chooses a scripture source.
 * A future API.Bible NKJV provider replaces the return value here.
 * Screens keep calling this function and never talk to a network themselves.
 */
export function getBibleProvider(): BibleProvider {
  return placeholderBibleProvider;
}
