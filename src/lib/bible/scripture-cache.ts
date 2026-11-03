import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cacheIsFresh } from "./notice";
import type { BibleVerse } from "./types";

export const SCRIPTURE_CACHE_ENV = "SCRIPTURE_CACHE_KEY";
export const SUPABASE_SECRET_ENV = "SUPABASE_SECRET_KEY";

export type StoredChapter = {
  verses: BibleVerse[];
  copyright: string;
  fumsToken: string | null;
  fetchedAt: number;
};

export type ScriptureCache = {
  read(bookId: string, chapter: number): Promise<StoredChapter | null>;
  write(bookId: string, chapter: number, value: StoredChapter): Promise<void>;
};

type CacheRow = {
  payload: string;
  fetched_at: string;
};

export function scriptureKeyBytes(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf8").digest();
}

/** Seals a chapter so the database never holds verse wording. */
export function sealChapter(value: StoredChapter, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", scriptureKeyBytes(secret), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function openChapter(payload: string, secret: string): StoredChapter | null {
  try {
    const bytes = Buffer.from(payload, "base64");
    if (bytes.length < 12 + 16 + 1) return null;
    const iv = bytes.subarray(0, 12);
    const tag = bytes.subarray(12, 28);
    const encrypted = bytes.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", scriptureKeyBytes(secret), iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    return parseStored(JSON.parse(json) as unknown);
  } catch {
    return null;
  }
}

function parseStored(value: unknown): StoredChapter | null {
  if (!value || typeof value !== "object") return null;
  const row = value as StoredChapter;
  if (!Array.isArray(row.verses) || typeof row.copyright !== "string" || typeof row.fetchedAt !== "number") return null;
  const verses = row.verses.filter(
    (verse) =>
      verse &&
      typeof verse.bookId === "string" &&
      Number.isInteger(verse.chapter) &&
      Number.isInteger(verse.verse) &&
      typeof verse.text === "string",
  );
  return {
    verses,
    copyright: row.copyright,
    fumsToken: typeof row.fumsToken === "string" && row.fumsToken.trim() ? row.fumsToken : null,
    fetchedAt: row.fetchedAt,
  };
}

export function createMemoryScriptureCache(secret: string): ScriptureCache & {
  sealed(bookId: string, chapter: number): string | null;
} {
  const rows = new Map<string, { payload: string; fetchedAt: number }>();
  const keyOf = (bookId: string, chapter: number) => `${bookId}.${chapter}`;
  return {
    sealed(bookId, chapter) {
      return rows.get(keyOf(bookId, chapter))?.payload ?? null;
    },
    async read(bookId, chapter) {
      const row = rows.get(keyOf(bookId, chapter));
      if (!row) return null;
      const opened = openChapter(row.payload, secret);
      if (!opened || !cacheIsFresh(opened.fetchedAt, Date.now())) return null;
      return opened;
    },
    async write(bookId, chapter, value) {
      rows.set(keyOf(bookId, chapter), { payload: sealChapter(value, secret), fetchedAt: value.fetchedAt });
    },
  };
}

export const noopScriptureCache: ScriptureCache = {
  async read() {
    return null;
  },
  async write() {},
};

function secretClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const secret = process.env[SUPABASE_SECRET_ENV]?.trim();
  const cacheKey = process.env[SCRIPTURE_CACHE_ENV]?.trim();
  if (!url || !secret || !cacheKey) return null;
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/** Shared across players. Misses the network when the encryption key or secret key is unset. */
export function defaultScriptureCache(): ScriptureCache {
  const secret = process.env[SCRIPTURE_CACHE_ENV]?.trim();
  if (!secret || !secretClient()) return noopScriptureCache;
  return {
    async read(bookId, chapter) {
      const client = secretClient();
      const cacheKey = process.env[SCRIPTURE_CACHE_ENV]?.trim();
      if (!client || !cacheKey) return null;
      const result = await client
        .from("scripture_chapter_cache")
        .select("payload, fetched_at")
        .eq("book_id", bookId)
        .eq("chapter", chapter)
        .maybeSingle();
      if (result.error || !result.data) return null;
      const row = result.data as CacheRow;
      const opened = openChapter(row.payload, cacheKey);
      if (!opened) return null;
      const storedAt = Date.parse(row.fetched_at);
      const fetchedAt = Number.isFinite(storedAt) ? storedAt : opened.fetchedAt;
      if (!cacheIsFresh(fetchedAt, Date.now()) || !cacheIsFresh(opened.fetchedAt, Date.now())) return null;
      return opened;
    },
    async write(bookId, chapter, value) {
      const client = secretClient();
      const cacheKey = process.env[SCRIPTURE_CACHE_ENV]?.trim();
      if (!client || !cacheKey) return;
      const payload = sealChapter(value, cacheKey);
      const result = await client.from("scripture_chapter_cache").upsert({
        book_id: bookId,
        chapter,
        payload,
        fetched_at: new Date(value.fetchedAt).toISOString(),
      });
      if (result.error) console.error("Scripture cache write failed");
    },
  };
}
