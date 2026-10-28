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
};

export type BiblePassage = {
  ref: string;
  bookId: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  verses: BibleVerse[];
};

/**
 * Scripture source. The app asks this interface for books, chapters, and
 * passages. Swap the implementation in `getBibleProvider` only.
 */
export interface BibleProvider {
  readonly id: string;
  listBooks(): Promise<BibleBookSummary[]>;
  getChapter(bookId: string, chapter: number): Promise<BibleChapter | null>;
  getPassage(ref: string): Promise<BiblePassage | null>;
}
