import "server-only";
import { findBook, parseReference, passageId } from "./books";
import { versesFromContent } from "./content-json";
import {
  MISSING_KEY_MESSAGE,
  SCRIPTURE_RETRY_MESSAGE,
  UNKNOWN_CHAPTER_MESSAGE,
  UNKNOWN_PASSAGE_MESSAGE,
  copyrightForDisplay,
} from "./notice";
import type { BibleChapter, BiblePassage } from "./types";

export const API_BIBLE_ROOT = "https://rest.api.bible/v1";
export const NKJV_BIBLE_ID = "63097d2a0a2f7db3-01";

export type LoadResult<T> =
  | { ok: true; status: 200; data: T }
  | { ok: false; status: number; message: string };

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

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
): Promise<{ ok: true; body: ApiEnvelope } | { ok: false; status: number; message: string }> {
  let response: Response;
  try {
    // Fetch on display. Do not persist the body. A stored copy would have to be
    // encrypted at rest, impossible to export, refreshed before SCRIPTURE_CACHE_MAX_AGE_MS,
    // and, when tied to an account, deleted within ACCOUNT_SCRIPTURE_DELETE_WITHIN_MS.
    response = await fetchImpl(scriptureUrl(path), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "api-key": key,
      },
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 502, message: SCRIPTURE_RETRY_MESSAGE };
  }
  if (response.status === 404) {
    return { ok: false, status: 404, message: UNKNOWN_PASSAGE_MESSAGE };
  }
  if (!response.ok) {
    return { ok: false, status: 502, message: SCRIPTURE_RETRY_MESSAGE };
  }
  try {
    const body = (await response.json()) as ApiEnvelope;
    return { ok: true, body };
  } catch {
    return { ok: false, status: 502, message: SCRIPTURE_RETRY_MESSAGE };
  }
}

export async function loadChapter(
  bookId: string,
  chapter: number,
  deps?: { fetch?: FetchLike; key?: string | null },
): Promise<LoadResult<BibleChapter>> {
  const book = findBook(bookId);
  if (!book || !Number.isInteger(chapter) || chapter < 1 || chapter > book.chapterCount) {
    return { ok: false, status: 404, message: UNKNOWN_CHAPTER_MESSAGE };
  }
  const key = deps && "key" in deps ? usableKey(deps.key) : apiBibleKey();
  if (!key) return { ok: false, status: 503, message: MISSING_KEY_MESSAGE };
  const fetched = await fetchScripture(
    `/bibles/${NKJV_BIBLE_ID}/chapters/${book.id}.${chapter}`,
    deps?.fetch ?? fetch,
    key,
  );
  if (!fetched.ok) {
    return fetched.status === 404
      ? { ok: false, status: 404, message: UNKNOWN_CHAPTER_MESSAGE }
      : fetched;
  }
  const verses = versesFromContent(fetched.body.data?.content, {
    bookId: book.id,
    chapter,
    verseStart: 1,
    verseEnd: 1,
  });
  if (verses.length === 0) return { ok: false, status: 502, message: SCRIPTURE_RETRY_MESSAGE };
  return {
    ok: true,
    status: 200,
    data: {
      bookId: book.id,
      chapter,
      verses,
      copyright: copyrightForDisplay(fetched.body.data?.copyright),
      fumsToken: fumsTokenFrom(fetched.body.meta),
    },
  };
}

export async function loadPassage(
  ref: string,
  deps?: { fetch?: FetchLike; key?: string | null },
): Promise<LoadResult<BiblePassage>> {
  const parsed = parseReference(ref);
  if (!parsed) return { ok: false, status: 404, message: UNKNOWN_PASSAGE_MESSAGE };
  const key = deps && "key" in deps ? usableKey(deps.key) : apiBibleKey();
  if (!key) return { ok: false, status: 503, message: MISSING_KEY_MESSAGE };
  const id = passageId(parsed.book.id, parsed.chapter, parsed.verseStart, parsed.verseEnd);
  const fetched = await fetchScripture(
    `/bibles/${NKJV_BIBLE_ID}/passages/${encodeURIComponent(id)}`,
    deps?.fetch ?? fetch,
    key,
  );
  if (!fetched.ok) return fetched;
  const verses = versesFromContent(fetched.body.data?.content, {
    bookId: parsed.book.id,
    chapter: parsed.chapter,
    verseStart: parsed.verseStart,
    verseEnd: parsed.verseEnd,
  }).filter((verse) => verse.verse >= parsed.verseStart && verse.verse <= parsed.verseEnd);
  if (verses.length === 0) return { ok: false, status: 502, message: SCRIPTURE_RETRY_MESSAGE };
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
      copyright: copyrightForDisplay(fetched.body.data?.copyright),
      fumsToken: fumsTokenFrom(fetched.body.meta),
    },
  };
}
