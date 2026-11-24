import devotionFile from "../../../content/devotions/devotions.json";

export type DevotionEntry = {
  id: string;
  reference: string;
  image: string;
};

export const DEVOTION_TIME_ZONE = "America/Chicago";

/** Fixed calendar epoch so a date always maps to the same list index. */
export const DEVOTION_EPOCH_UTC = Date.UTC(2020, 0, 1);

export const devotionEntries: readonly DevotionEntry[] = devotionFile.entries;

const IMAGE_ALT: Record<string, string> = {
  "coast.webp": "Green cliffs along a misty sea",
  "wheat.webp": "A wheat field at sunrise",
  "lake.webp": "A still mountain lake reflecting snowy peaks",
  "olive.webp": "Olive trees beside a stone path at sunset",
};

export function chicagoDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DEVOTION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const year = pick("year");
  const month = pick("month");
  const day = pick("day");
  if (!year || !month || !day) return "1970-01-01";
  return `${year}-${month}-${day}`;
}

/** Day index in the Chicago calendar. It does not take a player id. */
export function devotionIndexForDate(date: Date, count: number): number {
  if (count <= 0) return 0;
  const [year, month, day] = chicagoDateKey(date).split("-").map(Number);
  const days = Math.floor((Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1) - DEVOTION_EPOCH_UTC) / 86_400_000);
  return ((days % count) + count) % count;
}

export function devotionForDate(date: Date, entries: readonly DevotionEntry[] = devotionEntries): DevotionEntry | null {
  if (entries.length === 0) return null;
  return entries[devotionIndexForDate(date, entries.length)] ?? null;
}

export function devotionImageSrc(image: string): string {
  return `/devotion/${image}`;
}

export function devotionImageAlt(image: string): string {
  return IMAGE_ALT[image] ?? "Scenic landscape";
}
