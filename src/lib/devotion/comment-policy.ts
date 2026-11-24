import { isValidCalendarDate, type CalendarDate } from "@/lib/account/age-gate";
import { chicagoDateKey } from "./catalog";

export function chicagoToday(now = new Date()): CalendarDate {
  const [year, month, day] = chicagoDateKey(now).split("-").map(Number);
  return { year: year ?? 1970, month: month ?? 1, day: day ?? 1 };
}

export const COMMENT_DAILY_LIMIT = 3;

export const COMMENT_RATE_MESSAGE = "You've written three comments today. Tomorrow is a fresh start.";

export const COMMENT_CLOSED_MESSAGE = "Writing comments isn't available on this account.";

export function parseIsoDate(value: string): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const date = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  return isValidCalendarDate(date) ? date : null;
}

/**
 * 13+ from a birth month and year only.
 * The birthday is treated as the last day of that month, so the player is 13
 * on the first day of the next month, after that month has fully passed.
 */
export function commentAgeReached(year: number, month: number, today: CalendarDate): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return false;
  if (!isValidCalendarDate(today)) return false;
  const openMonth = month === 12 ? 1 : month + 1;
  const openYear = year + 13 + (month === 12 ? 1 : 0);
  if (today.year !== openYear) return today.year > openYear;
  return today.month > openMonth || today.month === openMonth;
}

/** Comment month and year win when set. Otherwise the private birth date supplies them. */
export function commentMonthYear(input: {
  birthDate?: string | null;
  birthYear?: number | null;
  birthMonth?: number | null;
}): { year: number; month: number } | null {
  if (typeof input.birthYear === "number" && typeof input.birthMonth === "number") {
    if (input.birthMonth >= 1 && input.birthMonth <= 12) return { year: input.birthYear, month: input.birthMonth };
  }
  if (input.birthDate) {
    const birth = parseIsoDate(input.birthDate);
    if (birth) return { year: birth.year, month: birth.month };
  }
  return null;
}

export type CommentAccess = {
  canPost: boolean;
  needsBirthDate: boolean;
  under13: boolean;
};

/** Signed-in players with no saved month and year can read. They cannot post until they enter one. */
export function commentAccess(
  input: { signedIn: boolean; birthDate?: string | null; birthYear?: number | null; birthMonth?: number | null },
  today: CalendarDate,
): CommentAccess {
  if (!input.signedIn) return { canPost: false, needsBirthDate: false, under13: false };
  const birth = commentMonthYear(input);
  if (!birth) return { canPost: false, needsBirthDate: true, under13: false };
  const canPost = commentAgeReached(birth.year, birth.month, today);
  return { canPost, needsBirthDate: false, under13: !canPost };
}

export function commentInsertDecision(
  input: { signedIn: boolean; birthDate?: string | null; birthYear?: number | null; birthMonth?: number | null; countToday: number },
  today: CalendarDate,
): { ok: true } | { ok: false; message: string } {
  if (!input.signedIn) return { ok: false, message: "Sign in to comment." };
  const access = commentAccess(input, today);
  if (!access.canPost) return { ok: false, message: COMMENT_CLOSED_MESSAGE };
  if (!withinCommentRateLimit(input.countToday)) return { ok: false, message: COMMENT_RATE_MESSAGE };
  return { ok: true };
}

export function birthFieldsChangeAllowed(input: {
  actor: "owner" | "service" | "other";
  previous: { birthDate: string | null; year: number | null; month: number | null };
  next: { birthDate: string | null; year: number | null; month: number | null };
}): boolean {
  if (input.actor === "service") return true;
  if (input.actor !== "owner") return false;
  if (input.previous.birthDate !== null && input.previous.birthDate !== input.next.birthDate) return false;
  const yearChanged = input.previous.year !== input.next.year || input.previous.month !== input.next.month;
  if (input.previous.year !== null && yearChanged) return false;
  if (input.previous.birthDate !== null && input.previous.year === null && input.next.year !== null) return false;
  return true;
}

export function withinCommentRateLimit(countToday: number): boolean {
  return Number.isInteger(countToday) && countToday >= 0 && countToday < COMMENT_DAILY_LIMIT;
}

export function hideOnReport<T extends { hiddenAt: string | null }>(comment: T, now: string): T {
  if (comment.hiddenAt) return comment;
  return { ...comment, hiddenAt: now };
}
