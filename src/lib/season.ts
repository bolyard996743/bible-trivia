/** Turn this off to keep the stage map in its ordinary colors all year. */
export const SEASONAL_THEMES_ENABLED = true;

export type SeasonName = "none" | "christmas" | "easter";

const ZONE = "America/Los_Angeles";

export type CalendarDay = {
  year: number;
  month: number;
  day: number;
};

export function losAngelesDate(date: Date): CalendarDay {
  const format = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const bag: Record<string, string> = {};
  for (const part of format.formatToParts(date)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  return { year: Number(bag.year), month: Number(bag.month), day: Number(bag.day) };
}

/** Easter Sunday for a Gregorian year, from the anonymous computus. */
export function easterSunday(year: number): CalendarDay {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { year, month, day };
}

function stamp(day: CalendarDay): number {
  return Date.UTC(day.year, day.month - 1, day.day);
}

function shift(day: CalendarDay, delta: number): CalendarDay {
  const next = new Date(Date.UTC(day.year, day.month - 1, day.day + delta));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() };
}

/**
 * Christmas is December in America/Los_Angeles.
 * Easter runs from Palm Sunday through Easter Sunday.
 */
export function seasonFor(date: Date, enabled = SEASONAL_THEMES_ENABLED): SeasonName {
  if (!enabled) return "none";
  const today = losAngelesDate(date);
  if (today.month === 12) return "christmas";
  const easter = easterSunday(today.year);
  const palm = shift(easter, -7);
  const todayStamp = stamp(today);
  if (todayStamp >= stamp(palm) && todayStamp <= stamp(easter)) return "easter";
  return "none";
}

export function seasonClass(season: SeasonName): string {
  if (season === "christmas") return "season-christmas";
  if (season === "easter") return "season-easter";
  return "";
}
