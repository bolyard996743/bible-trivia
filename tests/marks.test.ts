import { describe, expect, it } from "vitest";
import { placeholderBibleProvider } from "@/lib/bible/placeholder";
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
      color: "yellow",
      note: "Come back to this.",
    });
    expect(saved).toMatchObject({
      id: "mark-1",
      bookId: "JHN",
      chapter: 3,
      verseStart: 16,
      verseEnd: 17,
      color: "yellow",
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
      color: "green",
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
    store.add({ bookId: "PSA", chapter: 23, verseStart: 1, verseEnd: 1, color: "blue" });
    clock.tick = new Date("2026-10-29T08:00:00.000Z");
    const updated = store.update("mark-1", { note: "A psalm to sit with." });
    expect(updated?.note).toBe("A psalm to sit with.");
    expect(updated?.createdAt).toBe("2026-10-28T12:00:00.000Z");
    expect(updated?.updatedAt).toBe("2026-10-29T08:00:00.000Z");
    store.remove("mark-1");
    expect(store.list()).toEqual([]);
  });

  it("reads an older gold highlight as yellow and still drops verse text", () => {
    const storage = memory();
    storage.setItem(
      "bible-trivia-marks-v1",
      JSON.stringify({
        version: 1,
        marks: [
          {
            id: "old",
            bookId: "GEN",
            chapter: 1,
            verseStart: 1,
            verseEnd: 1,
            color: "gold",
            note: "Kept",
            createdAt: "2026-10-28T12:00:00.000Z",
            updatedAt: "2026-10-28T12:00:00.000Z",
            text: "In the beginning God created the heavens and the earth.",
          },
        ],
      }),
    );
    const loaded = storeFor(storage).list();
    expect(loaded[0]?.color).toBe("yellow");
    expect(loaded[0]?.note).toBe("Kept");
    expect(loaded[0]).not.toHaveProperty("text");
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
    const provider = placeholderBibleProvider;
    expect(provider.id).toBe("placeholder");
    const books = await provider.listBooks();
    expect(books).toHaveLength(66);
    const chapter = await provider.getChapter("JHN", 3);
    expect(chapter).toEqual({
      ok: true,
      data: { bookId: "JHN", chapter: 3, verses: [], copyright: "", fumsToken: null },
    });
    const passage = await provider.getPassage("John 3:16-17");
    expect(passage).toEqual({
      ok: true,
      data: {
        ref: "John 3:16-17",
        bookId: "JHN",
        chapter: 3,
        verseStart: 16,
        verseEnd: 17,
        verses: [],
        copyright: "",
        fumsToken: null,
      },
    });
    expect(JSON.stringify(passage)).not.toMatch(/loved the world/i);
    expect(await provider.getChapter("JHN", 99)).toEqual({
      ok: false,
      message: "That chapter isn't in this Bible.",
    });
  });
});
