import { createHttpBibleProvider } from "./http";
import type { BibleProvider } from "./types";

export type {
  BibleBookSummary,
  BibleChapter,
  BiblePassage,
  BibleProvider,
  BibleVerse,
  ScriptureResult,
} from "./types";

export { BOOKS, findBook, parseReference } from "./books";
export { questionsForDisplay } from "./present";

/**
 * The only scripture source screens should call.
 * It reads this app's route handlers. Those handlers are the only code that calls API.Bible.
 */
export function getBibleProvider(): BibleProvider {
  return createHttpBibleProvider();
}
