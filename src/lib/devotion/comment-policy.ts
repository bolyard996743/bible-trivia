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
 * 13+ from the birth date when we have one.
 * Child is under 13. Teen is 13–17. Adult and older are older than that.
 * With no birth date, only a stored teen, adult, or older band may post.
 */
export function commentPostAllowed(
  input: { birthDate: string | null; ageGroup: string | null },
  today?: CalendarDate,
): boolean {
  if (input.birthDate) {
    const birth = parseIsoDate(input.birthDate);
    if (!birth) return false;
    return ageGroupFromBirthDate(birth, today) !== "child";
  }
  return input.ageGroup === "teen" || input.ageGroup === "adult" || input.ageGroup === "older";
}

export function withinCommentRateLimit(countToday: number): boolean {
  return Number.isInteger(countToday) && countToday >= 0 && countToday < COMMENT_DAILY_LIMIT;
}

export function hideOnReport<T extends { hiddenAt: string | null }>(comment: T, now: string): T {
  if (comment.hiddenAt) return comment;
  return { ...comment, hiddenAt: now };
}
