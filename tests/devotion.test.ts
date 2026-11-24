import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NKJV_BIBLE_ID } from "@/lib/bible/api-bible";
import { parsePassageId } from "@/lib/bible/books";
import { NKJV_COPYRIGHT } from "@/lib/bible/notice";
import { createMemoryScriptureCache } from "@/lib/bible/scripture-cache";
import { validateDevotions } from "@/lib/content/devotions";
import {
  chicagoDateKey,
  devotionEntries,
  devotionForDate,
  type DevotionEntry,
} from "@/lib/devotion/catalog";
import { applyLikeToggle, likeTap } from "@/lib/devotion/likes";
import { loadDailyDevotion } from "@/lib/devotion/load";
import { devotionSharePayload, shareDevotion, type SharePayload } from "@/lib/devotion/share";

const KEY = "test-key-should-not-leak";
const originalKey = process.env.API_BIBLE_KEY;
const originalFetch = globalThis.fetch;

afterEach(() => {
  if (originalKey === undefined) delete process.env.API_BIBLE_KEY;
  else process.env.API_BIBLE_KEY = originalKey;
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

function chapterContent(bookId: string, chapter: number, verseStart: number, verseEnd: number) {
  const blocks = [];
  for (let verse = verseStart; verse <= verseEnd; verse += 1) {
    blocks.push({
      name: "para",
      type: "tag",
      items: [
        {
          name: "verse",
          type: "tag",
          attrs: { number: String(verse) },
          items: [{ type: "text", text: String(verse) }],
        },
        {
          type: "text",
          text: `Sample wording ${verse}. `,
          attrs: { verseId: `${bookId}.${chapter}.${verse}` },
        },
      ],
    });
  }
  return blocks;
}

function envelope(content: unknown) {
  return {
    data: {
      content,
      copyright:
        "Scripture taken from the New King James Version. Copyright © 1982 by Thomas Nelson. Used by permission. All rights reserved.",
    },
    meta: { fumsToken: "fums-token-test" },
  };
}

describe("daily devotion selection", () => {
  it("picks the same verse for every player on a Chicago date", () => {
    const when = new Date("2026-11-24T17:00:00.000Z");
    expect(chicagoDateKey(when)).toBe("2026-11-24");
    const ids = ["chris", "amina", "guest"].map((userId) => {
      void userId;
      return devotionForDate(when)?.id;
    });
    expect(new Set(ids).size).toBe(1);
    expect(ids[0]).toBeTruthy();
  });

  it("stays on the same entry through a Chicago day and changes at midnight", () => {
    const morning = new Date("2026-11-24T12:00:00.000Z");
    const evening = new Date("2026-11-24T23:30:00.000Z");
    expect(chicagoDateKey(morning)).toBe("2026-11-24");
    expect(chicagoDateKey(evening)).toBe("2026-11-24");
    expect(devotionForDate(morning)?.id).toBe(devotionForDate(evening)?.id);

    const beforeStandard = new Date("2026-01-15T05:59:00.000Z");
    const afterStandard = new Date("2026-01-15T06:00:00.000Z");
    expect(chicagoDateKey(beforeStandard)).toBe("2026-01-14");
    expect(chicagoDateKey(afterStandard)).toBe("2026-01-15");
    expect(devotionForDate(beforeStandard)?.id).not.toBe(devotionForDate(afterStandard)?.id);

    const beforeDaylight = new Date("2026-07-15T04:59:00.000Z");
    const afterDaylight = new Date("2026-07-15T05:00:00.000Z");
    expect(chicagoDateKey(beforeDaylight)).toBe("2026-07-14");
    expect(chicagoDateKey(afterDaylight)).toBe("2026-07-15");
    expect(devotionForDate(beforeDaylight)?.id).not.toBe(devotionForDate(afterDaylight)?.id);
  });

  it("is deterministic from the Chicago date, including dates before the epoch", () => {
    const first = new Date("2020-01-01T18:00:00.000Z");
    const second = new Date("2020-01-02T18:00:00.000Z");
    const beforeEpoch = new Date("2019-12-31T18:00:00.000Z");
    expect(devotionForDate(first)?.id).toBe(devotionEntries[0]?.id);
    expect(devotionForDate(second)?.id).toBe(devotionEntries[1]?.id);
    expect(devotionForDate(first)?.image).not.toBe(devotionForDate(second)?.image);
    expect(devotionForDate(beforeEpoch)?.id).toBe(devotionEntries[devotionEntries.length - 1]?.id);
    expect(devotionForDate(first)?.id).toBe(devotionForDate(new Date("2020-01-01T18:00:00.000Z"))?.id);
  });
});

describe("daily devotion scripture", () => {
  it("loads NKJV wording through the chapter cache and keeps the key off the result", async () => {
    const when = new Date("2020-01-01T18:00:00.000Z");
    const entry = devotionForDate(when);
    const parsed = parsePassageId(entry?.reference ?? "");
    expect(parsed).not.toBeNull();
    if (!parsed || !entry) return;
    const fetchImpl = vi.fn(async (input: string, init?: RequestInit) => {
      expect(input).toContain(`/bibles/${NKJV_BIBLE_ID}/chapters/${parsed.book.id}.${parsed.chapter}?`);
      expect(input).toContain("fums-version=3");
      expect(input).not.toContain(KEY);
      expect(new Headers(init?.headers).get("api-key")).toBe(KEY);
      return new Response(
        JSON.stringify(envelope(chapterContent(parsed.book.id, parsed.chapter, parsed.verseStart, parsed.verseEnd))),
        { status: 200 },
      );
    });
    const deps = { fetch: fetchImpl, key: KEY, cache: createMemoryScriptureCache("devotion-test-secret") };
    const first = await loadDailyDevotion(when, deps);
    const second = await loadDailyDevotion(when, deps);
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(first.id).toBe(second.id);
    expect(first.date).toBe(second.date);
    expect(first.text).toBe(second.text);
    expect(first.text).toContain("Sample wording");
    expect(first.label).toBe(`${parsed.ref} NKJV`);
    expect(first.copyright).toContain("Thomas Nelson");
    expect(first.fumsToken).toBe("fums-token-test");
    expect(JSON.stringify(first)).not.toContain(KEY);
    expect(fs.readFileSync(path.join(process.cwd(), "content/devotions/devotions.json"), "utf8")).not.toContain(
      "Sample wording",
    );
  });

  it("keeps the reference and a Bible tab link when the fetch fails", async () => {
    const when = new Date("2026-03-15T18:00:00.000Z");
    const entry = devotionForDate(when);
    const parsed = parsePassageId(entry?.reference ?? "");
    const fetchImpl = vi.fn(async () => {
      throw new Error("offline");
    });
    const failed = await loadDailyDevotion(when, {
      fetch: fetchImpl,
      key: KEY,
      cache: createMemoryScriptureCache("devotion-fail-secret"),
    });
    expect(failed.text).toBeNull();
    expect(failed.copyright).toBeNull();
    expect(failed.fumsToken).toBeNull();
    expect(failed.label).toBe(parsed ? `${parsed.ref} NKJV` : entry?.reference);
    expect(failed.bibleHref).toBe(parsed ? `/bible?book=${parsed.book.id}&chapter=${parsed.chapter}` : "/bible");

    const missingKey = await loadDailyDevotion(when, {
      key: null,
      fetch: vi.fn(),
      cache: createMemoryScriptureCache("devotion-missing-key"),
    });
    expect(missingKey.text).toBeNull();
    expect(missingKey.label).toMatch(/NKJV$/);
    expect(missingKey.bibleHref).toContain("/bible?book=");
  });

  it("does not throw when the scripture call returns an error status", async () => {
    const when = new Date("2026-05-02T18:00:00.000Z");
    const view = await loadDailyDevotion(when, {
      key: KEY,
      cache: createMemoryScriptureCache("devotion-status-secret"),
      fetch: async () => new Response("nope", { status: 503 }),
    });
    expect(view.text).toBeNull();
    expect(view.label).toMatch(/NKJV$/);
    expect(view.bibleHref.startsWith("/bible")).toBe(true);
    expect(NKJV_COPYRIGHT.length).toBeGreaterThan(0);
  });
});

describe("devotion likes and share", () => {
  it("toggles a like optimistically and prompts when signed out", () => {
    expect(likeTap({ signedIn: false, liked: false, count: 4 })).toEqual({ type: "prompt-sign-in" });
    expect(likeTap({ signedIn: true, liked: false, count: 4 })).toEqual({
      type: "toggle",
      next: { liked: true, count: 5 },
    });
    expect(applyLikeToggle({ liked: true, count: 5 })).toEqual({ liked: false, count: 4 });
    expect(applyLikeToggle({ liked: true, count: 0 })).toEqual({ liked: false, count: 0 });
    expect(applyLikeToggle({ liked: false, count: null })).toEqual({ liked: true, count: null });
    expect(likeTap({ signedIn: true, liked: true, count: null })).toEqual({
      type: "toggle",
      next: { liked: false, count: null },
    });
  });

  it("shares the reference and home link, and copies the link when share is missing or fails", async () => {
    const payload = devotionSharePayload({
      referenceLabel: "Joshua 1:8 NKJV",
      url: "https://noble-bereans.vercel.app/home",
    });
    expect(payload).toEqual({
      title: "Daily Devotion",
      text: "Joshua 1:8 NKJV",
      url: "https://noble-bereans.vercel.app/home",
    });
    expect(payload.text).not.toMatch(/meditate|prosperous/);

    const writes: string[] = [];
    await expect(shareDevotion(payload, { writeText: async (value) => { writes.push(value); } })).resolves.toBe("copied");
    expect(writes).toEqual([payload.url]);

    await expect(
      shareDevotion(payload, {
        share: async () => {
          throw new Error("share unavailable");
        },
        writeText: async () => {},
      }),
    ).resolves.toBe("copied");

    const abort = new Error("dismissed");
    abort.name = "AbortError";
    let copied = false;
    await expect(
      shareDevotion(payload, {
        share: async () => {
          throw abort;
        },
        writeText: async () => {
          copied = true;
        },
      }),
    ).resolves.toBe("dismissed");
    expect(copied).toBe(false);

    const shared: SharePayload[] = [];
    await expect(
      shareDevotion(payload, {
        share: async (data) => {
          shared.push(data);
        },
        writeText: async () => {
          throw new Error("should not copy");
        },
      }),
    ).resolves.toBe("shared");
    expect(shared).toEqual([payload]);
  });
});

describe("devotion content file", () => {
  it("ships a sample list with passage ids and no stored wording", () => {
    const file = JSON.parse(fs.readFileSync(path.join(process.cwd(), "content/devotions/devotions.json"), "utf8")) as {
      status: string;
      note: string;
      entries: DevotionEntry[];
    };
    expect(file.status).toBe("sample");
    expect(file.note.toLowerCase()).toMatch(/sample|placeholder/);
    expect(file.entries).toHaveLength(7);
    for (const entry of file.entries) {
      expect(Object.keys(entry).sort()).toEqual(["id", "image", "reference"]);
      expect(parsePassageId(entry.reference)).not.toBeNull();
      expect(fs.existsSync(path.join(process.cwd(), "public", "devotion", entry.image))).toBe(true);
    }
    const check = validateDevotions(process.cwd());
    expect(check.errors).toEqual([]);
    expect(check.entryCount).toBe(7);
  });

  it("rejects duplicate ids, bad passage ids, missing images, and a thought field", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "devotions-"));
    const base = {
      status: "sample",
      note: "SAMPLE placeholder list",
      entries: [{ id: "sample-jos-1-8", reference: "JOS.1.8", image: "coast.webp" }],
    };
    writeFixture(dir, base);
    expect(validateDevotions(dir).ok).toBe(true);

    writeFixture(dir, {
      ...base,
      entries: [
        { id: "sample-jos-1-8", reference: "JOS.1.8", image: "coast.webp" },
        { id: "sample-jos-1-8", reference: "JHN.3.16", image: "coast.webp" },
      ],
    });
    expect(validateDevotions(dir).errors.some((error) => error.includes("duplicates sample-jos-1-8"))).toBe(true);

    writeFixture(dir, {
      ...base,
      entries: [{ id: "sample-jos-1-8", reference: "Joshua 1:8", image: "coast.webp" }],
    });
    expect(validateDevotions(dir).errors.some((error) => error.includes("Joshua 1:8"))).toBe(true);

    writeFixture(dir, {
      ...base,
      entries: [{ id: "sample-jos-1-8", reference: "JOS.1.8", image: "missing.webp" }],
    });
    expect(validateDevotions(dir).errors.some((error) => error.includes("missing.webp"))).toBe(true);

    writeFixture(dir, {
      ...base,
      entries: [{ id: "sample-jos-1-8", reference: "JOS.1.8", image: "coast.webp", thought: "A short line." }],
    });
    expect(validateDevotions(dir).errors.some((error) => error.includes("thought is not part of the devotion format"))).toBe(
      true,
    );
  });

  it("puts the card above the rest of home and leaves comments unstored", () => {
    const home = fs.readFileSync(path.join(process.cwd(), "src/app/home/page.tsx"), "utf8");
    expect(home.indexOf("<DailyDevotionCard")).toBeLessThan(home.indexOf("<HomeClient"));
    const card = fs.readFileSync(path.join(process.cwd(), "src/components/DailyDevotionCard.tsx"), "utf8");
    expect(card).not.toMatch(/\b(Seed|Sprout|Rooted|Growing|Established|Fruitful|foundation|intermediate|advanced|expert)\b/);
    expect(card).not.toMatch(/\b(child|teen|adult|older)\b/);
    expect(card).not.toContain("thought");
    const actions = fs.readFileSync(path.join(process.cwd(), "src/components/DevotionActions.tsx"), "utf8");
    expect(actions).toContain("aria-pressed");
    expect(actions).toContain("Coming soon");
    expect(actions).toContain("Link copied");
    expect(actions).not.toMatch(/devotion_comments|comment_text/);
    const load = fs.readFileSync(path.join(process.cwd(), "src/lib/devotion/load.ts"), "utf8");
    expect(load).toContain("loadPassage");
    expect(load).not.toContain("readFileSync");
    const sql = fs.readFileSync(
      path.join(process.cwd(), "supabase/migrations/20261124120000_devotion_likes.sql"),
      "utf8",
    );
    expect(sql).toContain("create table public.devotion_likes");
    expect(sql).toContain("primary key (user_id, devotion_date)");
    expect(sql).toContain("alter table public.devotion_likes enable row level security");
    expect(sql).toContain("revoke all on public.devotion_likes from anon, public");
    expect(sql).toContain("grant execute on function public.devotion_like_count(date) to anon, authenticated");
    expect(sql).not.toMatch(/verse_text|scripture_text|passage_text|nkjv_text/);
    const policies = sql.match(/create policy [\s\S]*?;/g) ?? [];
    expect(policies).toHaveLength(3);
    for (const policy of policies) {
      expect(policy).toContain("(select auth.uid()) = user_id");
    }
    expect(sql).not.toContain("for update");
    expect(sql).not.toContain("for select to anon");
  });
});

function writeFixture(dir: string, value: unknown) {
  fs.mkdirSync(path.join(dir, "content", "devotions"), { recursive: true });
  fs.mkdirSync(path.join(dir, "public", "devotion"), { recursive: true });
  fs.writeFileSync(path.join(dir, "content", "devotions", "devotions.json"), JSON.stringify(value));
  fs.writeFileSync(path.join(dir, "public", "devotion", "coast.webp"), "");
}
