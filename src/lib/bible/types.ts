export type Testament = "OT" | "NT";

export type BibleBookSummary = {
  id: string;
  name: string;
  testament: Testament;
  chapterCount: number;
};

/** A verse a provider may supply. The placeholder leaves `text` empty. */
export type BibleVerse = {
  bookId: string;
  chapter: number;
  verse: number;
  text: string;
};

export type BibleChapter = {
  bookId: string;
  chapter: number;
  verses: BibleVerse[];
  /** Copyright line returned with this display, or the NKJV notice. */
  copyright: string;
  /** FUMS token for this display. Null when the response did not include one. */
  fumsToken: string | null;
};

export type BiblePassage = {
  ref: string;
  bookId: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  verses: BibleVerse[];
  copyright: string;
  fumsToken: string | null;
};

export type ScriptureResult<T> = { ok: true; data: T } | { ok: false; message: string };

/**
 * Scripture source. The app asks this interface for books, chapters, and
 * passages. Screens call `getBibleProvider`. Only the server route talks to API.Bible.
 */
export interface BibleProvider {
  readonly id: string;
  listBooks(): Promise<BibleBookSummary[]>;
  getChapter(bookId: string, chapter: number): Promise<ScriptureResult<BibleChapter>>;
  getPassage(ref: string): Promise<ScriptureResult<BiblePassage>>;
}
