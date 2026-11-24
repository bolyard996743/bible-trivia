import "server-only";
import { loadPassage } from "@/lib/bible/api-bible";
import { parsePassageId } from "@/lib/bible/books";
import { sharedScriptureCache, type ScriptureCache } from "@/lib/bible/scripture-cache";
import { chicagoDateKey, devotionForDate, devotionImageAlt, devotionImageSrc } from "./catalog";
import type { DailyDevotionView } from "./types";

type PassageDeps = {
  fetch?: (input: string, init?: RequestInit) => Promise<Response>;
  key?: string | null;
  cache?: ScriptureCache;
  now?: () => number;
};

function emptyView(date: string): DailyDevotionView {
  return {
    id: "",
    date,
    label: "Daily Devotion",
    imageSrc: devotionImageSrc("coast.webp"),
    imageAlt: devotionImageAlt("coast.webp"),
    bibleHref: "/bible",
    text: null,
    copyright: null,
    fumsToken: null,
  };
}

/**
 * One devotion for the Chicago date. Verse wording comes from the scripture cache.
 * A failed fetch still returns the reference and a Bible-tab link.
 */
export async function loadDailyDevotion(now = new Date(), deps?: PassageDeps): Promise<DailyDevotionView> {
  const date = chicagoDateKey(now);
  try {
    const entry = devotionForDate(now);
    if (!entry) return emptyView(date);
    const parsed = parsePassageId(entry.reference);
    const view: DailyDevotionView = {
      id: entry.id,
      date,
      label: parsed ? `${parsed.ref} NKJV` : entry.reference,
      imageSrc: devotionImageSrc(entry.image),
      imageAlt: devotionImageAlt(entry.image),
      bibleHref: parsed ? `/bible?book=${encodeURIComponent(parsed.book.id)}&chapter=${parsed.chapter}` : "/bible",
      text: null,
      copyright: null,
      fumsToken: null,
    };
    if (!parsed) return view;
    const result = await loadPassage(parsed.ref, deps ?? { cache: sharedScriptureCache() });
    if (!result.ok) return view;
    const text = result.data.verses
      .map((verse) => verse.text.trim())
      .filter((verse) => verse.length > 0)
      .join(" ");
    if (!text) return view;
    return {
      ...view,
      text,
      copyright: result.data.copyright,
      fumsToken: result.data.fumsToken,
    };
  } catch {
    console.error("Daily devotion could not be loaded");
    return emptyView(date);
  }
}
