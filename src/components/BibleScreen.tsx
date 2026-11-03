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
  type HighlightColor,
  type StorageLike,
  type VerseMark,
} from "@/lib/bible/marks";
import type { BibleBookSummary, BibleChapter } from "@/lib/bible/types";

const MARK_COLORS: { id: HighlightColor; label: string }[] = [
  { id: "red", label: "Red" },
  { id: "blue", label: "Blue" },
  { id: "green", label: "Green" },
  { id: "orange", label: "Orange" },
  { id: "yellow", label: "Yellow" },
];

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
  const [noteOpen, setNoteOpen] = useState(false);
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
    setNoteOpen(false);
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

  function openVerse(verse: number, editNote: boolean) {
    if (!book || !chapterNumber) return;
    const mark = markFor(marks, book.id, chapterNumber, verse);
    if (!editNote && activeVerse === verse) {
      setActiveVerse(null);
      setNoteOpen(false);
      return;
    }
    setActiveVerse(verse);
    setNoteOpen(editNote || Boolean(mark?.note));
    setDraftNote(mark?.note ?? "");
    setSaveError(null);
  }

  async function persist(next: VerseMark[]) {
    await getPlayerRepository().saveMarks(next);
    setMarks(next);
  }

  async function writeMark(verse: number, patch: { color: HighlightColor | null; note: string }) {
    if (!book || !chapterNumber) return;
    const store = createVerseMarkStore(memoryStorage(marks));
    const existing = markFor(store.list(), book.id, chapterNumber, verse);
    if (!patch.color && patch.note.trim() === "") {
      if (existing) store.remove(existing.id);
    } else if (existing) {
      store.update(existing.id, { color: patch.color, note: patch.note });
    } else {
      store.add({
        bookId: book.id,
        chapter: chapterNumber,
        verseStart: verse,
        verseEnd: verse,
        color: patch.color,
        note: patch.note,
      });
    }
    await persist(store.list());
  }

  async function applyColor(verse: number, color: HighlightColor) {
    if (!book || !chapterNumber) return;
    const existing = markFor(marks, book.id, chapterNumber, verse);
    const nextColor = existing?.color === color ? null : color;
    try {
      await writeMark(verse, { color: nextColor, note: existing?.note ?? "" });
      setSaveError(null);
    } catch {
      setSaveError("That highlight could not be saved.");
    }
  }

  async function saveNote() {
    if (!book || !chapterNumber || activeVerse == null) return;
    const existing = markFor(marks, book.id, chapterNumber, activeVerse);
    try {
      await writeMark(activeVerse, { color: existing?.color ?? null, note: draftNote });
      setNoteOpen(false);
      setActiveVerse(null);
      setSaveError(null);
    } catch {
      setSaveError("That note could not be saved.");
    }
  }

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
            <div className="scripture-page rounded-3xl border border-line bg-card px-5 py-6 sm:px-8" data-testid="bible-page">
              <div className="scripture-prose text-lg text-ink">
                {chapterState.chapter.verses.map((verse) => {
                  const mark = markFor(marks, book.id, chapterNumber, verse.verse);
                  const selected = activeVerse === verse.verse;
                  const showNote = Boolean(mark?.note) && !(selected && noteOpen);
                  return (
                    <span
                      key={verse.verse}
                      data-testid={`verse-${verse.verse}`}
                      data-highlight={mark?.color ?? ""}
                      className={selected || showNote ? "my-1 block" : "inline"}
                    >
                      <button
                        type="button"
                        data-testid={`highlight-verse-${verse.verse}`}
                        aria-pressed={selected}
                        onClick={() => openVerse(verse.verse, false)}
                        className={`verse-words ${mark?.color ? `hl-${mark.color}` : ""}`}
                      >
                        <span className="sr-only">{mark ? "Edit highlight. " : "Highlight. "}</span>
                        <sup className="mr-1 text-gold">{verse.verse}</sup>
                        {verse.text}{" "}
                      </button>
                      {showNote ? (
                        <button
                          type="button"
                          data-testid="verse-note-text"
                          onClick={() => openVerse(verse.verse, true)}
                          className="verse-note"
                        >
                          {mark?.note}
                        </button>
                      ) : null}
                      {selected ? (
                        <span className="my-2 flex items-center gap-2" data-testid="verse-tools">
                          <span className="flex items-center gap-1.5" role="group" aria-label="Highlight color">
                            {MARK_COLORS.map((color) => (
                              <button
                                key={color.id}
                                type="button"
                                data-testid={`highlight-${color.id}`}
                                aria-label={`${color.label} highlight`}
                                aria-pressed={mark?.color === color.id}
                                onClick={() => void applyColor(verse.verse, color.id)}
                                className={`mark-dot dot-${color.id} ${mark?.color === color.id ? "ring-2 ring-ink ring-offset-1" : ""}`}
                              />
                            ))}
                          </span>
                          <button
                            type="button"
                            data-testid="verse-pen"
                            aria-label="Write a note"
                            onClick={() => openVerse(verse.verse, true)}
                            className="mark-pen"
                          >
                            <PenIcon />
                          </button>
                        </span>
                      ) : null}
                      {selected && noteOpen ? (
                        <form
                          className="mb-3 grid gap-2"
                          data-testid="highlight-editor"
                          onSubmit={(event) => {
                            event.preventDefault();
                            void saveNote();
                          }}
                        >
                          <label htmlFor={`verse-note-${verse.verse}`} className="sr-only">
                            Your note
                          </label>
                          <textarea
                            id={`verse-note-${verse.verse}`}
                            data-testid="verse-note-input"
                            value={draftNote}
                            onChange={(event) => setDraftNote(event.target.value)}
                            rows={2}
                            className="rounded-xl border border-line bg-parchment px-3 py-2 text-base text-ink"
                          />
                          {saveError ? <p className="text-base text-ink">{saveError}</p> : null}
                          <button type="submit" data-testid="save-note" className="w-fit rounded-xl bg-grove px-3 text-base font-semibold text-white">
                            Save note
                          </button>
                        </form>
                      ) : null}
                    </span>
                  );
                })}
              </div>
              <ScriptureNotice copyright={chapterState.chapter.copyright} />
              <FumsTrack tokens={[chapterState.chapter.fumsToken]} />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function PenIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5" fill="none">
      <path d="M4 20h4l10-10-4-4L4 16v4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 6l4 4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
