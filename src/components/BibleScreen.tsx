"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FumsTrack } from "@/components/FumsTrack";
import { ScriptureNotice } from "@/components/ScriptureNotice";
import { getPlayerRepository } from "@/lib/account/repository";
import { getBibleProvider } from "@/lib/bible";
import { BOOKS } from "@/lib/bible/books";
import {
  createVerseMarkStore,
  HIGHLIGHT_COLORS,
  type HighlightColor,
  type StorageLike,
  type VerseMark,
} from "@/lib/bible/marks";
import type { BibleBookSummary, BibleChapter } from "@/lib/bible/types";

const COLOR_LABEL: Record<HighlightColor, string> = {
  gold: "Gold",
  grove: "Green",
  calm: "Blue",
};

function memoryStorage(initial: VerseMark[]): StorageLike {
  let raw: string | null = JSON.stringify({ version: 1, marks: initial });
  return {
    getItem: () => raw,
    setItem: (_key, value) => {
      raw = value;
    },
    removeItem: () => {
      raw = null;
    },
  };
}

function markFor(marks: VerseMark[], bookId: string, chapter: number, verse: number) {
  return (
    marks.find(
      (mark) => mark.bookId === bookId && mark.chapter === chapter && mark.verseStart <= verse && verse <= mark.verseEnd,
    ) ?? null
  );
}

type ChapterState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; chapter: BibleChapter }
  | { status: "error"; message: string };

export function BibleScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const bookId = params.get("book");
  const chapterParam = params.get("chapter");
  const chapterNumber = chapterParam ? Number(chapterParam) : null;
  const book = BOOKS.find((item) => item.id === bookId) ?? null;
  const [chapterState, setChapterState] = useState<ChapterState>({ status: "idle" });
  const [marks, setMarks] = useState<VerseMark[]>([]);
  const [activeVerse, setActiveVerse] = useState<number | null>(null);
  const [draftColor, setDraftColor] = useState<HighlightColor>("gold");
  const [draftNote, setDraftNote] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getPlayerRepository()
      .loadMarks()
      .then((loaded) => {
        if (active) setMarks(loaded);
      })
      .catch(() => {
        if (active) setMarks([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setActiveVerse(null);
    setSaveError(null);
    if (!book || !chapterNumber || !Number.isInteger(chapterNumber)) {
      setChapterState({ status: "idle" });
      return;
    }
    let active = true;
    setChapterState({ status: "loading" });
    void getBibleProvider()
      .getChapter(book.id, chapterNumber)
      .then((result) => {
        if (!active) return;
        setChapterState(result.ok ? { status: "ready", chapter: result.data } : { status: "error", message: result.message });
      });
    return () => {
      active = false;
    };
  }, [book, chapterNumber]);

  function openBook(next: BibleBookSummary) {
    router.push(`/bible?book=${next.id}`);
  }

  function openChapter(number: number) {
    if (!book) return;
    router.push(`/bible?book=${book.id}&chapter=${number}`);
  }

  function openVerse(verse: number) {
    if (!book || !chapterNumber) return;
    const mark = markFor(marks, book.id, chapterNumber, verse);
    setActiveVerse(verse);
    setDraftColor(mark?.color ?? "gold");
    setDraftNote(mark?.note ?? "");
    setSaveError(null);
  }

  async function persist(next: VerseMark[]) {
    await getPlayerRepository().saveMarks(next);
    setMarks(next);
  }

  async function saveNote() {
    if (!book || !chapterNumber || activeVerse == null) return;
    const store = createVerseMarkStore(memoryStorage(marks));
    const existing = markFor(store.list(), book.id, chapterNumber, activeVerse);
    if (existing) store.update(existing.id, { color: draftColor, note: draftNote });
    else {
      store.add({
        bookId: book.id,
        chapter: chapterNumber,
        verseStart: activeVerse,
        verseEnd: activeVerse,
        color: draftColor,
        note: draftNote,
      });
    }
    try {
      await persist(store.list());
      setSaveError(null);
    } catch {
      setSaveError("That note could not be saved.");
    }
  }

  async function removeNote() {
    if (!book || !chapterNumber || activeVerse == null) return;
    const store = createVerseMarkStore(memoryStorage(marks));
    const existing = markFor(store.list(), book.id, chapterNumber, activeVerse);
    if (!existing) return;
    store.remove(existing.id);
    try {
      await persist(store.list());
      setDraftNote("");
      setSaveError(null);
    } catch {
      setSaveError("That note could not be removed.");
    }
  }

  const activeMark =
    book && chapterNumber && activeVerse != null ? markFor(marks, book.id, chapterNumber, activeVerse) : null;

  return (
    <section className="grid gap-4">
      <p className="text-base tracking-wide text-gold uppercase">Scripture</p>
      <h1 className="text-3xl font-semibold text-grove-deep">Bible</h1>
      <p className="text-lg text-ink-soft">
        Highlights and notes stay with you. They remember the verse reference, not a copy of the verse.
      </p>

      {book ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => router.push("/bible")}
            className="rounded-2xl border border-line bg-card px-4 text-base text-ink"
          >
            All books
          </button>
          {chapterNumber ? (
            <button
              type="button"
              onClick={() => router.push(`/bible?book=${book.id}`)}
              className="rounded-2xl border border-line bg-card px-4 text-base text-ink"
            >
              {book.name}
            </button>
          ) : null}
        </div>
      ) : null}

      {!book ? (
        <div className="grid gap-5" data-testid="bible-books">
          {(["OT", "NT"] as const).map((testament) => (
            <div key={testament} className="grid gap-2">
              <h2 className="text-xl font-semibold text-grove-deep">
                {testament === "OT" ? "Old Testament" : "New Testament"}
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {BOOKS.filter((item) => item.testament === testament).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`book-${item.id}`}
                    onClick={() => openBook(item)}
                    className="rounded-2xl border border-line bg-card px-3 text-left text-base text-ink"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {book && !chapterNumber ? (
        <div className="grid gap-3" data-testid="bible-chapters">
          <h2 className="text-2xl font-semibold text-grove-deep">{book.name}</h2>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {Array.from({ length: book.chapterCount }, (_, index) => index + 1).map((number) => (
              <button
                key={number}
                type="button"
                data-testid={`chapter-${number}`}
                onClick={() => openChapter(number)}
                className="rounded-2xl border border-line bg-card px-2 text-base text-ink"
              >
                {number}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {book && chapterNumber ? (
        <div className="grid gap-4" data-testid="bible-reader">
          <h2 className="text-2xl font-semibold text-grove-deep">
            {book.name} {chapterNumber}
          </h2>
          {chapterState.status === "loading" ? <p className="text-lg text-ink-soft">Opening this chapter…</p> : null}
          {chapterState.status === "error" ? (
            <p data-testid="bible-unavailable" className="rounded-3xl border border-line bg-card p-5 text-lg text-ink">
              {chapterState.message}
            </p>
          ) : null}
          {chapterState.status === "ready" ? (
            <div className="grid gap-3">
              <ol className="grid gap-2">
                {chapterState.chapter.verses.map((verse) => {
                  const mark = markFor(marks, book.id, chapterNumber, verse.verse);
                  const selected = activeVerse === verse.verse;
                  return (
                    <li
                      key={verse.verse}
                      data-testid={`verse-${verse.verse}`}
                      data-highlight={mark?.color ?? ""}
                      className={`rounded-2xl border px-4 py-3 ${
                        mark?.color === "gold"
                          ? "verse-gold"
                          : mark?.color === "grove"
                            ? "verse-grove"
                            : mark?.color === "calm"
                              ? "verse-calm"
                              : "border-line bg-card"
                      } ${selected ? "border-grove" : "border-line"}`}
                    >
                      <button
                        type="button"
                        data-testid={`highlight-verse-${verse.verse}`}
                        aria-pressed={selected}
                        onClick={() => openVerse(verse.verse)}
                        className="text-left text-lg text-ink"
                      >
                        <span className="sr-only">{mark ? "Edit highlight. " : "Highlight. "}</span>
                        <sup className="mr-2 text-gold">{verse.verse}</sup>
                        {verse.text}
                      </button>
                      {mark?.note ? (
                        <p data-testid="verse-note-text" className="mt-2 text-base text-ink-soft">
                          {mark.note}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
              {activeVerse != null ? (
                <form
                  className="grid gap-3 rounded-3xl border border-line bg-card p-5"
                  data-testid="highlight-editor"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveNote();
                  }}
                >
                  <h3 className="text-xl font-semibold text-grove-deep">
                    {book.name} {chapterNumber}:{activeVerse}
                  </h3>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Highlight color">
                    {HIGHLIGHT_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        data-testid={`highlight-${color}`}
                        aria-pressed={draftColor === color}
                        onClick={() => setDraftColor(color)}
                        className={`rounded-2xl border px-4 text-base ${
                          draftColor === color ? "border-grove bg-grove text-white" : "border-line bg-parchment text-ink"
                        }`}
                      >
                        {COLOR_LABEL[color]}
                      </button>
                    ))}
                  </div>
                  <label htmlFor="verse-note" className="text-base text-ink">
                    Your note
                  </label>
                  <textarea
                    id="verse-note"
                    data-testid="verse-note-input"
                    value={draftNote}
                    onChange={(event) => setDraftNote(event.target.value)}
                    rows={3}
                    className="rounded-2xl border border-line bg-parchment px-4 py-3 text-lg text-ink"
                  />
                  {saveError ? <p className="text-base text-ink">{saveError}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    <button type="submit" data-testid="save-note" className="rounded-2xl bg-grove px-4 text-lg font-semibold text-white">
                      Save note
                    </button>
                    {activeMark ? (
                      <button
                        type="button"
                        data-testid="remove-note"
                        onClick={() => void removeNote()}
                        className="rounded-2xl border border-line bg-parchment px-4 text-lg text-ink"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </form>
              ) : null}
              <ScriptureNotice copyright={chapterState.chapter.copyright} />
              <FumsTrack tokens={[chapterState.chapter.fumsToken]} />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
