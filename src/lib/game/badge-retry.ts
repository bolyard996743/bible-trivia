import { MASCOT_IDS, type BadgeRetry, type GameProgress, type MascotId } from "./types";
import type { PathBadge } from "./path";

export type { BadgeRetry };

/** A failed badge attempt may be tried again after one full day. */
export const BADGE_RETRY_MS = 24 * 60 * 60 * 1000;

export const BADGE_RETRY_WAIT = "You can try this badge again in 24 hours.";
export const BADGE_RETRY_CARE = "There is no hurry. It will be waiting for you.";
export const BADGE_RETRY_CAPTION = "Ready again in";
export const BADGE_EARNED_NOTE = "This badge is yours.";
export const BADGE_PREPARING_NOTE =
  "These questions are still being prepared. The badge stays empty until they are ready.";

/** Older saves did not store first-try ids. A mastered question with no misses counts. */
export function passedFirstTry(progress: GameProgress, questionId: string): boolean {
  if (progress.firstTryIds) return progress.firstTryIds.includes(questionId);
  return progress.masteredIds.includes(questionId) && (progress.missCounts?.[questionId] ?? 0) === 0;
}

function isMascotKey(key: string): boolean {
  return MASCOT_IDS.includes(key as MascotId);
}

function cleanIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || item.length === 0 || ids.includes(item)) continue;
    ids.push(item);
  }
  return ids;
}

function cleanRetryAt(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return undefined;
  return new Date(parsed).toISOString();
}

function cleanUpdatedAt(value: unknown): string | undefined {
  return cleanRetryAt(value);
}

/** Drops mascot keys and anything that is not a badge attempt. */
export function normalizeBadgeRetries(value: unknown): Record<string, BadgeRetry> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const retries: Record<string, BadgeRetry> = {};
  for (const [badgeId, raw] of Object.entries(value)) {
    if (!badgeId || isMascotKey(badgeId)) continue;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const item = raw as { correctIds?: unknown; retryAt?: unknown; updatedAt?: unknown };
    const correctIds = cleanIds(item.correctIds);
    const retryAt = cleanRetryAt(item.retryAt);
    const updatedAt = cleanUpdatedAt(item.updatedAt);
    if (!retryAt && correctIds.length === 0) continue;
    const next: BadgeRetry = { correctIds: retryAt ? [] : correctIds };
    if (retryAt) next.retryAt = retryAt;
    if (updatedAt) next.updatedAt = updatedAt;
    retries[badgeId] = next;
  }
  return Object.keys(retries).length > 0 ? retries : undefined;
}

export function badgeRetriesToJson(value: GameProgress["badgeRetries"]): Record<string, BadgeRetry> {
  return normalizeBadgeRetries(value) ?? {};
}

export function badgeRetriesFromJson(value: unknown): GameProgress["badgeRetries"] {
  return normalizeBadgeRetries(value);
}

export function isBadgeWaiting(progress: GameProgress, badgeId: string, now: Date): boolean {
  const retryAt = progress.badgeRetries?.[badgeId]?.retryAt;
  if (!retryAt) return false;
  const at = Date.parse(retryAt);
  return Number.isFinite(at) && at > now.getTime();
}

export function badgeRetryDeadline(progress: GameProgress, badgeId: string): string | null {
  const retryAt = progress.badgeRetries?.[badgeId]?.retryAt;
  if (!retryAt) return null;
  const at = Date.parse(retryAt);
  return Number.isFinite(at) ? new Date(at).toISOString() : null;
}

export function badgeRetryRemaining(progress: GameProgress, badgeId: string, now: Date): number {
  const deadline = badgeRetryDeadline(progress, badgeId);
  if (!deadline) return 0;
  return Math.max(0, Date.parse(deadline) - now.getTime());
}

/** Hours, minutes, and seconds, always two digits, so the clock can tick in place. */
export function formatBadgeCountdown(ms: number): string {
  const total = Math.min(BADGE_RETRY_MS / 1000, Math.max(0, Math.ceil(ms / 1000)));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

/**
 * True when this stored attempt already has every question.
 * Null when the player has no attempt record yet (older saves use first-try ids).
 * A retry clock means the attempt was not clean, so the badge is not earned.
 */
export function badgeRunEarned(progress: GameProgress, badge: PathBadge): boolean | null {
  const run = progress.badgeRetries?.[badge.id];
  if (!run) return null;
  if (run.retryAt) return false;
  if (badge.questionIds.length === 0) return false;
  return badge.questionIds.every((id) => run.correctIds.includes(id));
}

function legacyEarned(progress: GameProgress, badge: PathBadge): boolean {
  return badge.questionIds.length > 0 && badge.questionIds.every((id) => passedFirstTry(progress, id));
}

/** Question ids that still count in the open attempt. A retry clock clears them. */
export function openAttemptCorrectIds(progress: GameProgress, badgeId: string): string[] {
  const run = progress.badgeRetries?.[badgeId];
  if (!run || run.retryAt) return [];
  return [...run.correctIds];
}

function withRun(progress: GameProgress, badgeId: string, run: BadgeRetry): GameProgress {
  return {
    ...progress,
    badgeRetries: { ...(progress.badgeRetries ?? {}), [badgeId]: run },
  };
}

/**
 * Record one answer in a badge attempt.
 * Any miss locks that badge for this player for 24 hours and clears the attempt.
 * The badge id is the only key. The mascot is not part of the record.
 */
export function recordBadgeAnswer(
  progress: GameProgress,
  badge: PathBadge,
  questionId: string,
  firstAttemptCorrect: boolean,
  now: Date,
): GameProgress {
  if (badge.questionIds.length === 0) return progress;
  if (!badge.questionIds.includes(questionId)) return progress;
  if (badgeRunEarned(progress, badge) === true) return progress;
  if (!progress.badgeRetries?.[badge.id] && legacyEarned(progress, badge)) return progress;
  if (isBadgeWaiting(progress, badge.id, now)) return progress;

  const updatedAt = now.toISOString();
  if (!firstAttemptCorrect) {
    return withRun(progress, badge.id, {
      correctIds: [],
      retryAt: new Date(now.getTime() + BADGE_RETRY_MS).toISOString(),
      updatedAt,
    });
  }

  const correctIds = openAttemptCorrectIds(progress, badge.id);
  if (!correctIds.includes(questionId)) correctIds.push(questionId);
  return withRun(progress, badge.id, { correctIds, updatedAt });
}

function stamp(run: BadgeRetry | undefined): string {
  return run?.updatedAt ?? "";
}

function copyRun(run: BadgeRetry): BadgeRetry {
  const next: BadgeRetry = { correctIds: run.retryAt ? [] : [...run.correctIds] };
  if (run.retryAt) next.retryAt = run.retryAt;
  if (run.updatedAt) next.updatedAt = run.updatedAt;
  return next;
}

/** Keep the newer attempt for each badge. Equal times keep the first record. */
export function mergeBadgeRetries(
  local: GameProgress["badgeRetries"],
  remote: GameProgress["badgeRetries"],
): GameProgress["badgeRetries"] {
  const ids = new Set([...Object.keys(local ?? {}), ...Object.keys(remote ?? {})]);
  const merged: Record<string, BadgeRetry> = {};
  for (const id of ids) {
    if (isMascotKey(id)) continue;
    const left = local?.[id];
    const right = remote?.[id];
    const chosen = !left ? right : !right ? left : stamp(left) >= stamp(right) ? left : right;
    if (!chosen) continue;
    const next = copyRun(chosen);
    if (!next.retryAt && next.correctIds.length === 0) continue;
    merged[id] = next;
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
}
