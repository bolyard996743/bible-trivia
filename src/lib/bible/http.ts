import { BOOKS } from "./books";
import { SCRIPTURE_RETRY_MESSAGE } from "./notice";
import type { BibleChapter, BiblePassage, BibleProvider, BibleVerse, ScriptureResult } from "./types";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

function isVerse(value: unknown): value is BibleVerse {
  if (!value || typeof value !== "object") return false;
  const verse = value as BibleVerse;
  return (
    typeof verse.bookId === "string" &&
    Number.isInteger(verse.chapter) &&
    Number.isInteger(verse.verse) &&
    typeof verse.text === "string"
  );
}

function asChapter(value: unknown): BibleChapter | null {
  if (!value || typeof value !== "object") return null;
  const chapter = value as BibleChapter;
  if (typeof chapter.bookId !== "string" || !Number.isInteger(chapter.chapter) || !Array.isArray(chapter.verses)) {
    return null;
  }
  return {
    bookId: chapter.bookId,
    chapter: chapter.chapter,
    verses: chapter.verses.filter(isVerse),
    copyright: typeof chapter.copyright === "string" ? chapter.copyright : "",
    fumsToken: typeof chapter.fumsToken === "string" ? chapter.fumsToken : null,
  };
}

function asPassage(value: unknown): BiblePassage | null {
  if (!value || typeof value !== "object") return null;
  const passage = value as BiblePassage;
  const chapter = asChapter(passage);
  if (!chapter || typeof passage.ref !== "string") return null;
  if (!Number.isInteger(passage.verseStart) || !Number.isInteger(passage.verseEnd)) return null;
  return {
    ...chapter,
    ref: passage.ref,
    verseStart: passage.verseStart,
    verseEnd: passage.verseEnd,
  };
}

async function readResult<T>(
  response: Response,
  pick: (value: unknown) => T | null,
): Promise<ScriptureResult<T>> {
  try {
    const body = (await response.json()) as { ok?: boolean; message?: string; chapter?: unknown; passage?: unknown };
    if (body.ok === true) {
      const data = pick(body.chapter ?? body.passage);
      if (data) return { ok: true, data };
    }
    if (typeof body.message === "string" && body.message.trim()) {
      return { ok: false, message: body.message };
    }
  } catch {
    return { ok: false, message: SCRIPTURE_RETRY_MESSAGE };
  }
  return { ok: false, message: SCRIPTURE_RETRY_MESSAGE };
}

/** Talks to this app's route handlers. It never calls API.Bible and never sees the key. */
export function createHttpBibleProvider(fetchImpl: FetchLike = fetch): BibleProvider {
  return {
    id: "api.bible",
    async listBooks() {
      return BOOKS.map((book) => ({ ...book }));
    },
    async getChapter(bookId, chapter) {
      try {
        const response = await fetchImpl(
          `/api/bible/chapter?bookId=${encodeURIComponent(bookId)}&chapter=${chapter}`,
          { cache: "no-store" },
        );
        return readResult(response, asChapter);
      } catch {
        return { ok: false, message: SCRIPTURE_RETRY_MESSAGE };
      }
    },
    async getPassage(ref) {
      try {
        const response = await fetchImpl(`/api/bible/passage?ref=${encodeURIComponent(ref)}`, {
          cache: "no-store",
        });
        return readResult(response, asPassage);
      } catch {
        return { ok: false, message: SCRIPTURE_RETRY_MESSAGE };
      }
    },
  };
}
