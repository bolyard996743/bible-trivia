import { BOOKS, findBook, parseReference } from "./books";
import type { BibleChapter, BiblePassage, BibleProvider } from "./types";

const emptyNotice = { copyright: "", fumsToken: null as string | null };

/**
 * Local stand-in used by tests. It knows the book list and how to read a reference.
 * It does not include verse text and does not call the network.
 */
export const placeholderBibleProvider: BibleProvider = {
  id: "placeholder",
  async listBooks() {
    return BOOKS.map((book) => ({ ...book }));
  },
  async getChapter(bookId, chapter) {
    const book = findBook(bookId);
    if (!book || !Number.isInteger(chapter) || chapter < 1 || chapter > book.chapterCount) {
      return { ok: false, message: "That chapter isn't in this Bible." };
    }
    const result: BibleChapter = { bookId: book.id, chapter, verses: [], ...emptyNotice };
    return { ok: true, data: result };
  },
  async getPassage(ref) {
    const parsed = parseReference(ref);
    if (!parsed) return { ok: false, message: "That passage isn't in this Bible." };
    const passage: BiblePassage = {
      ref: parsed.ref,
      bookId: parsed.book.id,
      chapter: parsed.chapter,
      verseStart: parsed.verseStart,
      verseEnd: parsed.verseEnd,
      verses: [],
      ...emptyNotice,
    };
    return { ok: true, data: passage };
  },
};
