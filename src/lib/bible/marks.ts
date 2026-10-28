export const VERSE_MARKS_KEY = "bible-trivia-marks-v1";

export const HIGHLIGHT_COLORS = ["gold", "grove", "calm"] as const;
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

/** A highlight or note. The reference is stored. The verse wording is not. */
export type VerseMark = {
  id: string;
  bookId: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  color: HighlightColor | null;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type VerseMarkDraft = {
  bookId: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  color?: HighlightColor | null;
  note?: string;
};

export type VerseMarkPatch = {
  color?: HighlightColor | null;
  note?: string;
  verseStart?: number;
  verseEnd?: number;
};

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

type StoredFile = {
  version: 1;
  marks: VerseMark[];
};

const STORED_KEYS = [
  "id",
  "bookId",
  "chapter",
  "verseStart",
  "verseEnd",
  "color",
  "note",
  "createdAt",
  "updatedAt",
] as const;

function isColor(value: unknown): value is HighlightColor | null {
  return value === null || (typeof value === "string" && HIGHLIGHT_COLORS.includes(value as HighlightColor));
}

function isMark(value: unknown): value is VerseMark {
  if (!value || typeof value !== "object") return false;
  const mark = value as VerseMark;
  return (
    typeof mark.id === "string" &&
    mark.id.length > 0 &&
    typeof mark.bookId === "string" &&
    mark.bookId.trim().length > 0 &&
    Number.isInteger(mark.chapter) &&
    mark.chapter >= 1 &&
    Number.isInteger(mark.verseStart) &&
    mark.verseStart >= 1 &&
    Number.isInteger(mark.verseEnd) &&
    mark.verseEnd >= mark.verseStart &&
    isColor(mark.color) &&
    typeof mark.note === "string" &&
    typeof mark.createdAt === "string" &&
    typeof mark.updatedAt === "string"
  );
}

function pickStored(mark: VerseMark): VerseMark {
  return {
    id: mark.id,
    bookId: mark.bookId.trim(),
    chapter: mark.chapter,
    verseStart: mark.verseStart,
    verseEnd: mark.verseEnd,
    color: mark.color,
    note: mark.note,
    createdAt: mark.createdAt,
    updatedAt: mark.updatedAt,
  };
}

function assertRange(verseStart: number, verseEnd: number) {
  if (!Number.isInteger(verseStart) || verseStart < 1 || !Number.isInteger(verseEnd) || verseEnd < verseStart) {
    throw new Error("A mark needs a verse range.");
  }
}

export function createVerseMarkStore(
  storage: StorageLike,
  options?: { now?: () => Date; createId?: () => string },
) {
  const now = options?.now ?? (() => new Date());
  const createId =
    options?.createId ??
    (() => `mark-${now().getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);

  function read(): VerseMark[] {
    const raw = storage.getItem(VERSE_MARKS_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as StoredFile;
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.marks)) return [];
      return parsed.marks.filter(isMark).map(pickStored);
    } catch {
      return [];
    }
  }

  function write(marks: VerseMark[]) {
    const file: StoredFile = { version: 1, marks: marks.map(pickStored) };
    const json = JSON.stringify(file);
    const saved = JSON.parse(json) as { marks: Record<string, unknown>[] };
    for (const mark of saved.marks) {
      for (const key of Object.keys(mark)) {
        if (!STORED_KEYS.includes(key as (typeof STORED_KEYS)[number])) {
          throw new Error("Verse wording cannot be stored with a highlight.");
        }
      }
    }
    storage.setItem(VERSE_MARKS_KEY, json);
  }

  return {
    list(): VerseMark[] {
      return read();
    },
    add(draft: VerseMarkDraft): VerseMark {
      if (typeof draft.bookId !== "string" || draft.bookId.trim() === "") {
        throw new Error("A mark needs a book id.");
      }
      if (!Number.isInteger(draft.chapter) || draft.chapter < 1) {
        throw new Error("A mark needs a chapter.");
      }
      assertRange(draft.verseStart, draft.verseEnd);
      const color = draft.color ?? null;
      if (!isColor(color)) throw new Error("Unknown highlight color.");
      if (draft.note != null && typeof draft.note !== "string") throw new Error("A note must be text.");
      const stamp = now().toISOString();
      const mark = pickStored({
        id: createId(),
        bookId: draft.bookId,
        chapter: draft.chapter,
        verseStart: draft.verseStart,
        verseEnd: draft.verseEnd,
        color,
        note: draft.note ?? "",
        createdAt: stamp,
        updatedAt: stamp,
      });
      write([mark, ...read()]);
      return mark;
    },
    update(id: string, patch: VerseMarkPatch): VerseMark | null {
      const marks = read();
      const index = marks.findIndex((mark) => mark.id === id);
      const current = marks[index];
      if (!current) return null;
      const verseStart = patch.verseStart ?? current.verseStart;
      const verseEnd = patch.verseEnd ?? current.verseEnd;
      assertRange(verseStart, verseEnd);
      const color = patch.color === undefined ? current.color : patch.color;
      if (!isColor(color)) throw new Error("Unknown highlight color.");
      if (patch.note != null && typeof patch.note !== "string") throw new Error("A note must be text.");
      const next = pickStored({
        ...current,
        verseStart,
        verseEnd,
        color,
        note: patch.note ?? current.note,
        updatedAt: now().toISOString(),
      });
      marks[index] = next;
      write(marks);
      return next;
    },
    remove(id: string) {
      write(read().filter((mark) => mark.id !== id));
    },
    replace(next: VerseMark[]) {
      write(next.filter(isMark).map(pickStored));
    },
  };
}
