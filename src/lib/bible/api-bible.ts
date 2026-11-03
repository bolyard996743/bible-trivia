import "server-only";
import { findBook, parseReference } from "./books";
import { versesFromContent } from "./content-json";
import {
  MISSING_KEY_MESSAGE,
  SCRIPTURE_RETRY_MESSAGE,
  UNKNOWN_CHAPTER_MESSAGE,
  UNKNOWN_PASSAGE_MESSAGE,
  cacheIsFresh,
  copyrightForDisplay,
} from "./notice";
import { defaultScriptureCache, type ScriptureCache, type StoredChapter } from "./scripture-cache";
import type { BibleChapter, BiblePassage } from "./types";

export const API_BIBLE_ROOT = "https://rest.api.bible/v1";
export const NKJV_BIBLE_ID = "63097d2a0a2f7db3-01";

export type LoadResult<T> =
  | { ok: true; status: 200; data: T }
  | { ok: false; status: number; message: string; upstreamStatus?: number };

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

type ScriptureDeps = {
  fetch?: FetchLike;
  key?: string | null;
  cache?: ScriptureCache;
  now?: () => number;
};

type ApiEnvelope = {
  data?: {
    content?: unknown;
    copyright?: string;
  };
  meta?: {
    fumsToken?: unknown;
  };
};

/**
 * Read at runtime so a build does not inline the key.
 * The name is not NEXT_PUBLIC_, and this module is server-only.
 */
export function apiBibleKey(): string | null {
  return usableKey(process.env["API_BIBLE_KEY"]);
}

function usableKey(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function scriptureUrl(path: string): string {
  const url = new URL(`${API_BIBLE_ROOT}${path}`);
  url.searchParams.set("content-type", "json");
  url.searchParams.set("include-notes", "false");
  url.searchParams.set("include-titles", "false");
  url.searchParams.set("include-chapter-numbers", "false");
  url.searchParams.set("include-verse-numbers", "false");
  url.searchParams.set("include-verse-spans", "false");
  url.searchParams.set("fums-version", "3");
  return url.toString();
}

function fumsTokenFrom(meta: ApiEnvelope["meta"]): string | null {
  const token = meta?.fumsToken;
  if (typeof token !== "string") return null;
  const trimmed = token.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function fetchScripture(
  path: string,
  fetchImpl: FetchLike,
  key: string,
): Promise<{ ok: true; body: ApiEnvelope } | { ok: false; status: number; message: string; upstreamStatus?: number }> {
  let response: Response;
  try {
    response = await fetchImpl(scriptureUrl(path), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "api-key": key,
      },
      cache: "no-store",
    });
  } catch {
    console.error("API.Bible request failed before a status was returned");
    return { ok: false, status: 502, message: SCRIPTURE_RETRY_MESSAGE };
  }
  if (!response.ok) {
    if (response.status === 429 || response.status === 402) console.error("API.Bible monthly quota was reached");
    else console.error(`API.Bible responded with status ${response.status}`);
    return {
      ok: false,
      status: response.status === 404 ? 404 : 502,
      message: response.status === 404 ? UNKNOWN_PASSAGE_MESSAGE : SCRIPTURE_RETRY_MESSAGE,
      upstreamStatus: response.status,
    };
  }
  try {
    const body = (await response.json()) as ApiEnvelope;
    return { ok: true, body };
  } catch {
    console.error(`API.Bible response was not JSON (status ${response.status})`);
    return { ok: false, status: 502, message: SCRIPTURE_RETRY_MESSAGE, upstreamStatus: response.status };
  }
}

function chapterResult(bookId: string, chapter: number, stored: StoredChapter): LoadResult<BibleChapter> {
  return {
    ok: true,
    status: 200,
    data: {
      bookId,
      chapter,
      verses: stored.verses,
      copyright: stored.copyright,
      fumsToken: stored.fumsToken,
    },
  };
}

async function readFresh(
  cache: ScriptureCache,
  bookId: string,
  chapter: number,
  now: number,
): Promise<StoredChapter | null> {
  try {
    const stored = await cache.read(bookId, chapter);
    if (!stored || !cacheIsFresh(stored.fetchedAt, now)) return null;
    return stored;
  } catch {
    console.error("Scripture cache read failed");
    return null;
  }
}

export async function loadChapter(
  bookId: string,
  chapter: number,
  deps?: ScriptureDeps,
): Promise<LoadResult<BibleChapter>> {
  const book = findBook(bookId);
  if (!book || !Number.isInteger(chapter) || chapter < 1 || chapter > book.chapterCount) {
    return { ok: false, status: 404, message: UNKNOWN_CHAPTER_MESSAGE };
  }
  const key = deps && "key" in deps ? usableKey(deps.key) : apiBibleKey();
  if (!key) return { ok: false, status: 503, message: MISSING_KEY_MESSAGE };
  const cache = deps?.cache ?? defaultScriptureCache();
  const now = deps?.now?.() ?? Date.now();
  const fresh = await readFresh(cache, book.id, chapter, now);
  if (fresh) return chapterResult(book.id, chapter, fresh);
  const fetched = await fetchScripture(
    `/bibles/${NKJV_BIBLE_ID}/chapters/${book.id}.${chapter}`,
    deps?.fetch ?? fetch,
    key,
  );
  if (!fetched.ok) {
    return fetched.status === 404
      ? { ok: false, status: 404, message: UNKNOWN_CHAPTER_MESSAGE, upstreamStatus: fetched.upstreamStatus }
      : fetched;
  }
  const verses = versesFromContent(fetched.body.data?.content, {
    bookId: book.id,
    chapter,
    verseStart: 1,
    verseEnd: 1,
  });
  if (verses.length === 0) return { ok: false, status: 502, message: SCRIPTURE_RETRY_MESSAGE };
  const stored: StoredChapter = {
    verses,
    copyright: copyrightForDisplay(fetched.body.data?.copyright),
    fumsToken: fumsTokenFrom(fetched.body.meta),
    fetchedAt: now,
  };
  try {
    await cache.write(book.id, chapter, stored);
  } catch {
    console.error("Scripture cache write failed");
  }
  return chapterResult(book.id, chapter, stored);
}

export async function loadPassage(ref: string, deps?: ScriptureDeps): Promise<LoadResult<BiblePassage>> {
  const parsed = parseReference(ref);
  if (!parsed) return { ok: false, status: 404, message: UNKNOWN_PASSAGE_MESSAGE };
  const chapter = await loadChapter(parsed.book.id, parsed.chapter, deps);
  if (!chapter.ok) {
    return chapter.status === 404
      ? { ok: false, status: 404, message: UNKNOWN_PASSAGE_MESSAGE, upstreamStatus: chapter.upstreamStatus }
      : chapter;
  }
  const verses = chapter.data.verses.filter(
    (verse) => verse.verse >= parsed.verseStart && verse.verse <= parsed.verseEnd,
  );
  if (verses.length === 0) return { ok: false, status: 404, message: UNKNOWN_PASSAGE_MESSAGE };
  return {
    ok: true,
    status: 200,
    data: {
      ref: parsed.ref,
      bookId: parsed.book.id,
      chapter: parsed.chapter,
      verseStart: parsed.verseStart,
      verseEnd: parsed.verseEnd,
      verses,
      copyright: chapter.data.copyright,
      fumsToken: chapter.data.fumsToken,
    },
  };
}
