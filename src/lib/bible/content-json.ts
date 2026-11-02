import type { BibleVerse } from "./types";

type ContentNode = {
  type?: string;
  name?: string;
  text?: string;
  attrs?: {
    verseId?: string;
    number?: string;
  };
  items?: ContentNode[];
};

const VERSE_ID = /^[A-Z0-9]+\.(\d+)\.(\d+)$/;

export type VerseFallback = {
  bookId: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
};

function clean(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Turns API.Bible `content-type=json` blocks into verses.
 * Verse number tags are not copied into the wording.
 */
export function versesFromContent(content: unknown, fallback: VerseFallback): BibleVerse[] {
  if (typeof content === "string") {
    const text = clean(content.replace(/<[^>]+>/g, " "));
    if (!text) return [];
    return [{ bookId: fallback.bookId, chapter: fallback.chapter, verse: fallback.verseStart, text }];
  }

  if (!Array.isArray(content)) return [];

  const chunks = new Map<number, string[]>();
  let currentVerse: number | null = null;

  const add = (verse: number, piece: string) => {
    const text = piece.replace(/\s+/g, " ");
    if (!text.trim()) return;
    const list = chunks.get(verse) ?? [];
    list.push(text);
    chunks.set(verse, list);
  };

  const walk = (node: ContentNode, insideVerseNumber: boolean) => {
    if (!node || typeof node !== "object") return;
    if (node.name === "note") return;
    const verseId = node.attrs?.verseId;
    const parsed = verseId ? VERSE_ID.exec(verseId) : null;
    if (parsed) currentVerse = Number(parsed[2]);
    if (node.name === "verse") {
      if (node.attrs?.number && /^\d+$/.test(node.attrs.number)) currentVerse = Number(node.attrs.number);
      for (const child of node.items ?? []) walk(child, true);
      return;
    }
    if (node.type === "text" && typeof node.text === "string" && !insideVerseNumber && currentVerse) {
      add(currentVerse, node.text);
    }
    for (const child of node.items ?? []) walk(child, insideVerseNumber);
  };

  for (const node of content as ContentNode[]) walk(node, false);

  return [...chunks.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([verse, parts]) => ({
      bookId: fallback.bookId,
      chapter: fallback.chapter,
      verse,
      text: clean(parts.join(" ")),
    }))
    .filter((verse) => verse.text.length > 0);
}
