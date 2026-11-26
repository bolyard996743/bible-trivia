/** Monday 00:00 in America/Los_Angeles. The weekly board uses the same boundary. */

const ZONE = "America/Los_Angeles";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

type Wall = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: string;
};

function wallClock(date: Date): Wall {
  const format = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONE,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const bag: Record<string, string> = {};
  for (const part of format.formatToParts(date)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  let hour = Number(bag.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour,
    minute: Number(bag.minute),
    second: Number(bag.second),
    weekday: bag.weekday ?? "",
  };
}

function midnightInLosAngeles(year: number, month: number, day: number): Date {
  let utc = Date.UTC(year, month - 1, day, 8, 0, 0);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = wallClock(new Date(utc));
    const want = Date.UTC(year, month - 1, day, 0, 0, 0);
    const got = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    if (got === want) return new Date(utc);
    utc -= got - want;
  }
  return new Date(utc);
}

/** The Monday 00:00 America/Los_Angeles that contains `now`. Inclusive of that instant. */
export function weekStartLosAngeles(now: Date): Date {
  const parts = wallClock(now);
  const index = WEEKDAYS.indexOf(parts.weekday as (typeof WEEKDAYS)[number]);
  const daysBack = index < 0 ? 0 : index;
  const cursor = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  cursor.setUTCDate(cursor.getUTCDate() - daysBack);
  return midnightInLosAngeles(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, cursor.getUTCDate());
}

export function sameLeaderboardWeek(left: Date, right: Date): boolean {
  return weekStartLosAngeles(left).getTime() === weekStartLosAngeles(right).getTime();
}
