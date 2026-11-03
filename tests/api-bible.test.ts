import fs from "fs";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as getChapter } from "@/app/api/bible/chapter/route";
import { GET as getPassage } from "@/app/api/bible/passage/route";
import { API_BIBLE_ROOT, NKJV_BIBLE_ID, loadChapter, loadPassage } from "@/lib/bible/api-bible";
import { createMemoryScriptureCache } from "@/lib/bible/scripture-cache";
import { parseReference } from "@/lib/bible/books";
import { versesFromContent } from "@/lib/bible/content-json";
import { createHttpBibleProvider } from "@/lib/bible/http";
import {
  ACCOUNT_SCRIPTURE_DELETE_WITHIN_MS,
  MISSING_KEY_MESSAGE,
  NKJV_COPYRIGHT,
  SCRIPTURE_CACHE_MAX_AGE_MS,
  SCRIPTURE_RETRY_MESSAGE,
  cacheIsFresh,
  scriptureCacheWithinLicense,
} from "@/lib/bible/notice";
import { questionsForDisplay } from "@/lib/bible/present";
import type { Question } from "@/lib/game/types";

const KEY = "test-key-should-not-leak";

const chapterContent = [
  {
    name: "para",
    type: "tag",
    items: [
      { name: "verse", type: "tag", attrs: { number: "1" }, items: [{ type: "text", text: "1" }] },
      { type: "text", text: "Alpha created the sample. ", attrs: { verseId: "GEN.1.1" } },
    ],
  },
  {
    name: "para",
    type: "tag",
    items: [
      { name: "verse", type: "tag", attrs: { number: "2" }, items: [{ type: "text", text: "2" }] },
      { type: "text", text: "Second sample line.", attrs: { verseId: "GEN.1.2" } },
      { name: "note", type: "tag", items: [{ type: "text", text: "Skip this note." }] },
    ],
  },
];

const copyright = "Scripture taken from the New King James Version. Copyright © 1982 by Thomas Nelson. Used by permission. All rights reserved.";

function envelope(content: unknown) {
  return { data: { content, copyright }, meta: { fumsToken: "fums-token-test" } };
}

const originalKey = process.env.API_BIBLE_KEY;
const originalFetch = globalThis.fetch;

afterEach(() => {
  if (originalKey === undefined) delete process.env.API_BIBLE_KEY;
  else process.env.API_BIBLE_KEY = originalKey;
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("API.Bible NKJV client", () => {
  it("parses verse text and skips verse numbers and notes", () => {
    const verses = versesFromContent(chapterContent, { bookId: "GEN", chapter: 1, verseStart: 1, verseEnd: 2 });
    expect(verses).toEqual([
      { bookId: "GEN", chapter: 1, verse: 1, text: "Alpha created the sample." },
      { bookId: "GEN", chapter: 1, verse: 2, text: "Second sample line." },
    ]);
    expect(JSON.stringify(verses)).not.toContain("Skip this note");
  });

  it("calls API.Bible on the server and keeps the key out of the result", async () => {
    const fetchImpl = vi.fn(async (input: string, init?: RequestInit) => {
      expect(input.startsWith(`${API_BIBLE_ROOT}/bibles/${NKJV_BIBLE_ID}/chapters/GEN.1?`)).toBe(true);
      expect(input).toContain("fums-version=3");
      expect(input).toContain("content-type=json");
      expect(input).not.toContain(KEY);
      expect(new Headers(init?.headers).get("api-key")).toBe(KEY);
      return new Response(JSON.stringify(envelope(chapterContent)), { status: 200 });
    });
    const result = await loadChapter("GEN", 1, { fetch: fetchImpl, key: KEY });
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.verses[0]?.text).toBe("Alpha created the sample.");
    expect(result.data.copyright).toContain("Thomas Nelson");
    expect(result.data.fumsToken).toBe("fums-token-test");
    expect(JSON.stringify(result)).not.toContain(KEY);
  });

  it("serves passages from one shared chapter fetch and still returns a FUMS token", async () => {
    expect(parseReference("Psalm 119:105")?.book.id).toBe("PSA");
    const fetchImpl = vi.fn(async (input: string) => {
      expect(input).toContain("/chapters/JHN.3?");
      expect(input).not.toContain("/passages/");
      expect(input).not.toContain(KEY);
      return new Response(
        JSON.stringify(
          envelope([
            { type: "text", text: "First sample sentence. ", attrs: { verseId: "JHN.3.16" } },
            { type: "text", text: "Second sample sentence.", attrs: { verseId: "JHN.3.17" } },
          ]),
        ),
        { status: 200 },
      );
    });
    const cache = createMemoryScriptureCache("test-cache-secret");
    const deps = { fetch: fetchImpl, key: KEY, cache };
    const range = await loadPassage("John 3:16-17", deps);
    const one = await loadPassage("John 3:16", deps);
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(range.ok).toBe(true);
    expect(one.ok).toBe(true);
    if (!range.ok || !one.ok) return;
    expect(range.data.verses.map((verse) => verse.verse)).toEqual([16, 17]);
    expect(range.data.ref).toBe("John 3:16-17");
    expect(one.data.verses[0]?.text).toBe("First sample sentence.");
    expect(one.data.fumsToken).toBe("fums-token-test");
    expect(range.data.fumsToken).toBe("fums-token-test");
    const sealed = cache.sealed("JHN", 3) ?? "";
    expect(sealed).not.toContain("First sample");
    expect(sealed).not.toContain("Second sample");
    expect(sealed).not.toContain("fums-token-test");
  });

  it("answers a monthly quota error with the friendly message and keeps a fresh chapter", async () => {
    const cache = createMemoryScriptureCache("test-cache-secret");
    const denied = vi.fn(async () => new Response("monthly quota exceeded", { status: 429 }));
    const cold = await loadChapter("GEN", 1, { fetch: denied, key: KEY, cache });
    expect(cold).toMatchObject({ ok: false, status: 502, message: SCRIPTURE_RETRY_MESSAGE });
    expect(JSON.stringify(cold)).not.toContain("quota");

    const filled = vi.fn(async () => new Response(JSON.stringify(envelope(chapterContent)), { status: 200 }));
    const warm = await loadChapter("GEN", 1, { fetch: filled, key: KEY, cache });
    expect(warm.ok).toBe(true);
    const blocked = vi.fn(async () => new Response("monthly quota exceeded", { status: 429 }));
    const hit = await loadChapter("GEN", 1, { fetch: blocked, key: KEY, cache });
    expect(blocked).not.toHaveBeenCalled();
    expect(hit.ok).toBe(true);
    if (!hit.ok) return;
    expect(hit.data.fumsToken).toBe("fums-token-test");
    expect(hit.data.verses[0]?.text).toBe("Alpha created the sample.");
  });

  it("records the API.Bible status without returning the key", async () => {
    const fetchImpl = vi.fn(async () => new Response("no", { status: 401 }));
    const result = await loadChapter("GEN", 1, { fetch: fetchImpl, key: KEY });
    expect(result).toMatchObject({ ok: false, status: 502, upstreamStatus: 401, message: expect.any(String) });
    expect(JSON.stringify(result)).not.toContain(KEY);
  });

  it("returns a friendly message and does not call the network when the key is missing", async () => {
    const fetchImpl = vi.fn();
    const missing = await loadChapter("Genesis", 1, { fetch: fetchImpl, key: null });
    expect(missing).toEqual({ ok: false, status: 503, message: MISSING_KEY_MESSAGE });
    expect(fetchImpl).not.toHaveBeenCalled();
    const blank = await loadPassage("Genesis 1:1", { fetch: fetchImpl, key: "   " });
    expect(blank.ok).toBe(false);
    if (blank.ok) return;
    expect(blank.message).toBe(MISSING_KEY_MESSAGE);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("uses the runtime env key from the route and still hides it", async () => {
    process.env.API_BIBLE_KEY = KEY;
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify(envelope(chapterContent)), { status: 200 }));
    const response = await getChapter(new Request("https://noble-bereans.vercel.app/api/bible/chapter?bookId=GEN&chapter=1"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(body.chapter.verses[0].text).toBe("Alpha created the sample.");
    expect(JSON.stringify(body)).not.toContain(KEY);
    expect(body.chapter.copyright).toContain("New King James");
  });

  it("the passage route fails gracefully without a key", async () => {
    delete process.env.API_BIBLE_KEY;
    globalThis.fetch = vi.fn();
    const response = await getPassage(new Request("https://noble-bereans.vercel.app/api/bible/passage?ref=Genesis%201:1"));
    expect(response.status).toBe(503);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    const body = await response.json();
    expect(body).toEqual({ ok: false, message: MISSING_KEY_MESSAGE });
  });

  it("keeps the cache window inside the API.Bible license", () => {
    expect(scriptureCacheWithinLicense()).toBe(true);
    expect(SCRIPTURE_CACHE_MAX_AGE_MS).toBeLessThanOrEqual(30 * 24 * 60 * 60 * 1000);
    expect(ACCOUNT_SCRIPTURE_DELETE_WITHIN_MS).toBe(72 * 60 * 60 * 1000);
    const stored = Date.parse("2026-01-01T00:00:00.000Z");
    expect(cacheIsFresh(stored, stored + SCRIPTURE_CACHE_MAX_AGE_MS - 1)).toBe(true);
    expect(cacheIsFresh(stored, stored + SCRIPTURE_CACHE_MAX_AGE_MS)).toBe(false);
  });

  it("does not send bundled quotations to the browser", () => {
    const question = {
      id: "sample",
      teaching: {
        verses: [{ ref: "Genesis 1:1", text: "Alpha created the sample.", translation: "NKJV" as const }],
        explanation: { adult: "Read the verse." },
        takeaway: "See the verse.",
      },
    } as Question;
    const [shown] = questionsForDisplay([question]);
    expect(shown?.teaching.verses[0]).toEqual({ ref: "Genesis 1:1", text: "", translation: "NKJV" });
    expect(JSON.stringify(shown)).not.toContain("Alpha created");
  });

  it("reads scripture through our route, not API.Bible, from the browser provider", async () => {
    const fetchImpl = vi.fn(async (input: string) => {
      expect(input.startsWith("/api/bible/passage")).toBe(true);
      expect(input).not.toContain("rest.api.bible");
      expect(input).not.toContain(KEY);
      return new Response(
        JSON.stringify({
          ok: true,
          passage: {
            ref: "Genesis 1:1",
            bookId: "GEN",
            chapter: 1,
            verseStart: 1,
            verseEnd: 1,
            verses: [{ bookId: "GEN", chapter: 1, verse: 1, text: "Alpha created the sample." }],
            copyright: NKJV_COPYRIGHT,
            fumsToken: "fums-token-test",
          },
        }),
        { status: 200 },
      );
    });
    const provider = createHttpBibleProvider(fetchImpl);
    expect(provider.id).toBe("api.bible");
    expect(await provider.listBooks()).toHaveLength(66);
    const passage = await provider.getPassage("Genesis 1:1");
    expect(passage.ok).toBe(true);
    if (!passage.ok) return;
    expect(passage.data.verses[0]?.text).toBe("Alpha created the sample.");
  });
});

describe("API.Bible stays on the server", () => {
  it("mentions the key only in the server module and never as a public env var", () => {
    const root = path.join(process.cwd(), "src");
    const allowed = new Set([path.normalize(path.join(root, "lib/bible/api-bible.ts"))]);
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
          const source = fs.readFileSync(full, "utf8");
          if (source.includes("NEXT_PUBLIC_API_BIBLE")) hits.push(`${full} public key`);
          if (source.includes("API_BIBLE_KEY") && !allowed.has(path.normalize(full))) hits.push(full);
          if (source.includes("api-key") && !allowed.has(path.normalize(full))) hits.push(`${full} header`);
        }
      }
    };
    walk(root);
    expect(hits).toEqual([]);
    const server = fs.readFileSync(path.join(root, "lib/bible/api-bible.ts"), "utf8");
    expect(server).toContain('import "server-only"');
    expect(server).toContain("https://rest.api.bible/v1");
    expect(server).toContain("63097d2a0a2f7db3-01");
    const secretHits: string[] = [];
    const walkSecrets = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walkSecrets(full);
        else if (/\.(ts|tsx)$/.test(entry.name)) {
          const source = fs.readFileSync(full, "utf8");
          if (source.includes("SUPABASE_SECRET_KEY") || source.includes("SCRIPTURE_CACHE_KEY")) {
            if (!full.endsWith(`${path.sep}scripture-cache.ts`)) secretHits.push(full);
          }
        }
      }
    };
    walkSecrets(root);
    expect(secretHits).toEqual([]);
    const worker = fs.readFileSync(path.join(process.cwd(), "public/sw.js"), "utf8");
    expect(worker).toContain('url.pathname.startsWith("/api/bible")');
    expect(worker).toContain("no-store");
  });
});

describe("scripture chapter cache migration", () => {
  const sql = fs.readFileSync(
    path.join(process.cwd(), "supabase/migrations/20261103011530_scripture_chapter_cache.sql"),
    "utf8",
  );

  it("is shared, encrypted, and closed to the browser", () => {
    expect(sql).toContain("create table public.scripture_chapter_cache");
    expect(sql).toContain("primary key (book_id, chapter)");
    expect(sql).not.toContain("user_id");
    expect(sql).toContain("payload text not null");
    expect(sql).toContain("ciphertext");
    expect(sql).toContain("alter table public.scripture_chapter_cache enable row level security");
    expect(sql).toContain("revoke all on public.scripture_chapter_cache from anon, authenticated, public");
    expect(sql).not.toMatch(/create policy/);
    expect(sql).not.toMatch(/verse_text|scripture_text|passage_text|nkjv_text/);
    const apiRoot = path.join(process.cwd(), "src/app/api");
    const dumps: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (fs.readFileSync(full, "utf8").includes("scripture_chapter_cache")) dumps.push(full);
      }
    };
    walk(apiRoot);
    expect(dumps).toEqual([]);
  });
});

describe("bible reader marks migration", () => {
  const sql = fs.readFileSync(
    path.join(process.cwd(), "supabase/migrations/20261102180000_bible_reader_marks.sql"),
    "utf8",
  );

  it("keeps owner-only row access and refuses verse text", () => {
    expect(sql).toContain("alter table public.verse_marks enable row level security");
    expect(sql).toContain("revoke all on public.verse_marks from anon, public");
    expect(sql).not.toContain("to anon");
    expect(sql).not.toMatch(/verse_text|scripture_text|passage_text|nkjv_text/);
    const policies = sql.match(/create policy [\s\S]*?;/g) ?? [];
    expect(policies).toHaveLength(4);
    for (const policy of policies) {
      expect(policy).toContain("(select auth.uid()) = user_id");
    }
    expect(sql).toContain("verse_start");
    expect(sql).toContain("verse_end");
    expect(sql).toContain("72 hour");
  });
});
