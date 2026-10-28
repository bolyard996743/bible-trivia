import { describe, expect, it } from "vitest";
import { getBibleProvider } from "@/lib/bible";
import { createVerseMarkStore, type StorageLike, type VerseMarkDraft } from "@/lib/bible/marks";

function memory(): StorageLike & { raw(): string | null } {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
    removeItem: (key) => {
      items.delete(key);
    },
    raw: () => items.get("bible-trivia-marks-v1") ?? null,
  };
}

describe("verse mark store", () => {
  const clock = { tick: new Date("2026-10-28T12:00:00.000Z") };

  function storeFor(storage: StorageLike) {
    return createVerseMarkStore(storage, {
      now: () => clock.tick,
      createId: () => "mark-1",
    });
  }

  it("saves a highlight and a note by reference", () => {
    const storage = memory();
    const store = storeFor(storage);
    const saved = store.add({
      bookId: "JHN",
      chapter: 3,
      verseStart: 16,
      verseEnd: 17,
      color: "gold",
      note: "Come back to this.",
    });
    expect(saved).toMatchObject({
      id: "mark-1",
      bookId: "JHN",
      chapter: 3,
      verseStart: 16,
      verseEnd: 17,
      color: "gold",
      note: "Come back to this.",
      createdAt: "2026-10-28T12:00:00.000Z",
      updatedAt: "2026-10-28T12:00:00.000Z",
    });
    expect(store.list()).toEqual([saved]);
  });

  it("never writes verse wording, even if a caller tries to attach it", () => {
    const storage = memory();
    const store = storeFor(storage);
    store.add({
      bookId: "GEN",
      chapter: 1,
      verseStart: 1,
      verseEnd: 1,
      color: "grove",
      note: "The opening.",
      text: "In the beginning God created the heavens and the earth.",
      verseText: "In the beginning God created the heavens and the earth.",
    } as VerseMarkDraft);
    const raw = storage.raw() ?? "";
    expect(raw).not.toContain("In the beginning");
    expect(raw).not.toContain("verseText");
    expect(raw).not.toContain("\"text\"");
    expect(store.list()[0]).not.toHaveProperty("text");
  });

  it("updates the timestamp and can remove a mark", () => {
    const storage = memory();
    const store = storeFor(storage);
    store.add({ bookId: "PSA", chapter: 23, verseStart: 1, verseEnd: 1, color: "calm" });
    clock.tick = new Date("2026-10-29T08:00:00.000Z");
    const updated = store.update("mark-1", { note: "A psalm to sit with." });
    expect(updated?.note).toBe("A psalm to sit with.");
    expect(updated?.createdAt).toBe("2026-10-28T12:00:00.000Z");
    expect(updated?.updatedAt).toBe("2026-10-29T08:00:00.000Z");
    store.remove("mark-1");
    expect(store.list()).toEqual([]);
  });

  it("rejects a broken range and ignores a corrupt file", () => {
    const storage = memory();
    const store = storeFor(storage);
    expect(() => store.add({ bookId: "JHN", chapter: 3, verseStart: 18, verseEnd: 16 })).toThrow(
      /verse range/,
    );
    storage.setItem("bible-trivia-marks-v1", "{not json");
    expect(store.list()).toEqual([]);
  });
});

describe("placeholder Bible provider", () => {
  it("answers with references and no verse text", async () => {
    const provider = getBibleProvider();
    expect(provider.id).toBe("placeholder");
    const books = await provider.listBooks();
    expect(books).toHaveLength(66);
    const chapter = await provider.getChapter("JHN", 3);
    expect(chapter).toEqual({ bookId: "JHN", chapter: 3, verses: [] });
    const passage = await provider.getPassage("John 3:16-17");
    expect(passage).toEqual({
      ref: "John 3:16-17",
      bookId: "JHN",
      chapter: 3,
      verseStart: 16,
      verseEnd: 17,
      verses: [],
    });
    expect(JSON.stringify(passage)).not.toMatch(/loved the world/i);
    expect(await provider.getChapter("JHN", 99)).toBeNull();
  });
});
