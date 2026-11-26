/** Consecutive days the player has played. A gap starts a new count and a welcome, never a scolding. */

export type DailyPlayRecord = {
  lastPlayedOn: string | null;
  streak: number;
  best: number;
  /** The day a return welcome should stay up, including after they play. */
  welcomeOn: string | null;
};

export type DailyChallengeRecord = {
  day: string;
  questionId: string;
  correct: boolean;
  refs: string[];
};

export type DailyBadgeRecord = {
  day: string;
  ref: string;
};

export const WELCOME_BACK = "Welcome back";

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDayKey(value: string): boolean {
  const match = DAY_KEY.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function shiftDay(day: string, delta: number): string {
  const match = DAY_KEY.exec(day);
  if (!match) return day;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  date.setUTCDate(date.getUTCDate() + delta);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}-${dayOfMonth}`;
}

function cleanCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function cleanRef(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const ref = value.trim();
  if (!ref || ref.length > 48 || /[\r\n]/.test(ref)) return null;
  return ref;
}

export function normalizeDailyPlay(value: unknown): DailyPlayRecord | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as { lastPlayedOn?: unknown; streak?: unknown; best?: unknown; welcomeOn?: unknown };
  const lastPlayedOn = typeof record.lastPlayedOn === "string" && isDayKey(record.lastPlayedOn) ? record.lastPlayedOn : null;
  const streak = lastPlayedOn ? cleanCount(record.streak) : 0;
  const best = Math.max(streak, cleanCount(record.best));
  const welcomeOn = typeof record.welcomeOn === "string" && isDayKey(record.welcomeOn) ? record.welcomeOn : null;
  if (!lastPlayedOn && streak === 0 && !welcomeOn) return undefined;
  return { lastPlayedOn, streak, best, welcomeOn };
}

export function normalizeDailyChallenge(value: unknown): DailyChallengeRecord | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as { day?: unknown; questionId?: unknown; correct?: unknown; refs?: unknown };
  if (typeof record.day !== "string" || !isDayKey(record.day)) return undefined;
  if (typeof record.questionId !== "string" || record.questionId.length === 0 || record.questionId.length > 80) return undefined;
  if (typeof record.correct !== "boolean") return undefined;
  const refs = Array.isArray(record.refs) ? record.refs.flatMap((item) => { const ref = cleanRef(item); return ref ? [ref] : []; }) : [];
  return { day: record.day, questionId: record.questionId, correct: record.correct, refs };
}

export function normalizeDailyBadges(value: unknown): DailyBadgeRecord[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const byDay = new Map<string, DailyBadgeRecord>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const day = (item as { day?: unknown }).day;
    const ref = cleanRef((item as { ref?: unknown }).ref);
    if (typeof day !== "string" || !isDayKey(day) || !ref) continue;
    byDay.set(day, { day, ref });
  }
  const badges = [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
  return badges.length > 0 ? badges : undefined;
}

export function impliedDays(record: DailyPlayRecord | undefined): string[] {
  if (!record?.lastPlayedOn || record.streak <= 0) return [];
  const days: string[] = [];
  for (let index = 0; index < record.streak; index += 1) days.push(shiftDay(record.lastPlayedOn, -index));
  return days;
}

function longestRun(sorted: string[]): number {
  let best = 1;
  let run = 1;
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index] === shiftDay(sorted[index - 1] ?? "", 1)) run += 1;
    else run = 1;
    if (run > best) best = run;
  }
  return best;
}

export function recordFromDays(days: readonly string[], welcomeOn?: string | null): DailyPlayRecord | undefined {
  const unique = [...new Set(days.filter(isDayKey))].sort();
  if (unique.length === 0) return undefined;
  const last = unique[unique.length - 1] ?? "";
  let streak = 1;
  while (streak < unique.length && unique[unique.length - 1 - streak] === shiftDay(last, -streak)) streak += 1;
  const keptWelcome = welcomeOn && isDayKey(welcomeOn) ? welcomeOn : null;
  const returned = unique.length > 1 && !unique.includes(shiftDay(last, -1));
  return {
    lastPlayedOn: last,
    streak,
    best: Math.max(longestRun(unique), streak),
    welcomeOn: keptWelcome ?? (returned ? last : null),
  };
}

export function sameDaily(left: DailyPlayRecord | undefined, right: DailyPlayRecord | undefined): boolean {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return left.lastPlayedOn === right.lastPlayedOn && left.streak === right.streak && left.best === right.best && left.welcomeOn === right.welcomeOn;
}

export function mergeDailyRecords(local?: DailyPlayRecord, remote?: DailyPlayRecord): DailyPlayRecord | undefined {
  const welcome = local?.welcomeOn ?? remote?.welcomeOn ?? null;
  return recordFromDays([...impliedDays(local), ...impliedDays(remote)], welcome);
}

/** Count today. The same day does not add another. A gap starts again at one. */
export function applyPlayedDay(current: DailyPlayRecord | undefined, today: string): DailyPlayRecord {
  if (!isDayKey(today)) return current ?? { lastPlayedOn: null, streak: 0, best: 0, welcomeOn: null };
  if (current?.lastPlayedOn === today) return current;
  const yesterday = shiftDay(today, -1);
  if (current?.lastPlayedOn === yesterday) {
    const streak = current.streak + 1;
    return { lastPlayedOn: today, streak, best: Math.max(current.best, streak), welcomeOn: null };
  }
  const broke = Boolean(current?.lastPlayedOn);
  return {
    lastPlayedOn: today,
    streak: 1,
    best: Math.max(current?.best ?? 0, 1),
    welcomeOn: broke ? today : null,
  };
}

/** The flame shows only while the run is still alive (today or yesterday). */
export function visibleDailyStreak(record: DailyPlayRecord | undefined, today: string): number {
  if (!record?.lastPlayedOn || record.streak <= 0 || !isDayKey(today)) return 0;
  if (record.lastPlayedOn === today || record.lastPlayedOn === shiftDay(today, -1)) return record.streak;
  return 0;
}

export function shouldWelcomeBack(record: DailyPlayRecord | undefined, today: string): boolean {
  if (!record || !isDayKey(today)) return false;
  if (record.welcomeOn === today) return true;
  if (!record.lastPlayedOn) return false;
  if (record.lastPlayedOn === today || record.lastPlayedOn === shiftDay(today, -1)) return false;
  return true;
}

/** Grows a little with each day, then stays put. One day is the original flame. */
export function dailyFlameScale(days: number): number {
  if (!Number.isFinite(days) || days <= 1) return 1;
  const steps = Math.min(8, Math.floor(days) - 1);
  return 1 + steps * 0.1;
}
