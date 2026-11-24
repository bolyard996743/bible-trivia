import { ageGroupFromBirthDate, isValidCalendarDate, type CalendarDate } from "@/lib/account/age-gate";

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
 * Posting needs a birth date. Child is under 13 and teen starts at 13, so a
 * stored date can tell 12 from 13. A profile with only an age band cannot:
 * the band may have been saved without a date. Those accounts cannot post.
 */
export function commentPostAllowed(
  input: { birthDate: string | null; ageGroup?: string | null },
  today?: CalendarDate,
): boolean {
  if (!input.birthDate) return false;
  const birth = parseIsoDate(input.birthDate);
  if (!birth) return false;
  return ageGroupFromBirthDate(birth, today) !== "child";
}

export function withinCommentRateLimit(countToday: number): boolean {
  return Number.isInteger(countToday) && countToday >= 0 && countToday < COMMENT_DAILY_LIMIT;
}

export function hideOnReport<T extends { hiddenAt: string | null }>(comment: T, now: string): T {
  if (comment.hiddenAt) return comment;
  return { ...comment, hiddenAt: now };
}
