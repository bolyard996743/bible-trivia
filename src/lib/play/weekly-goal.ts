import { weekStartLosAngeles } from "../account/week";
import { STORAGE_KEY } from "../storage";

/** Answered questions this week. Display only. The weekly board is not changed. */
export const WEEKLY_GOAL_KEY = `${STORAGE_KEY}:weekly-goal`;

export const WEEKLY_GOAL = 50;

type WeekCount = {
  week: string;
  count: number;
};

export function weeklyGoalWeek(now: Date): string {
  return weekStartLosAngeles(now).toISOString();
}

export function goalFill(count: number, goal = WEEKLY_GOAL): number {
  if (!Number.isFinite(count) || count <= 0 || goal <= 0) return 0;
  return Math.min(1, count / goal);
}

export function goalLabelCount(count: number, goal = WEEKLY_GOAL): number {
  if (!Number.isFinite(count) || count <= 0) return 0;
  return Math.min(goal, Math.floor(count));
}

function parseWeekCount(raw: string | null): WeekCount | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as { week?: unknown; count?: unknown };
    if (!value || typeof value.week !== "string" || value.week.length === 0) return null;
    if (typeof value.count !== "number" || !Number.isFinite(value.count) || value.count < 0) return null;
    return { week: value.week, count: Math.floor(value.count) };
  } catch {
    return null;
  }
}

export function readWeeklyCount(storage: { getItem(key: string): string | null }, now: Date): number {
  const saved = parseWeekCount(storage.getItem(WEEKLY_GOAL_KEY));
  if (!saved || saved.week !== weeklyGoalWeek(now)) return 0;
  return saved.count;
}

/** Counts one answered question. A new Los Angeles week starts again at zero. */
export function recordAnsweredQuestion(
  storage: { getItem(key: string): string | null; setItem(key: string, value: string): void },
  now: Date,
): number {
  const week = weeklyGoalWeek(now);
  const saved = parseWeekCount(storage.getItem(WEEKLY_GOAL_KEY));
  const count = saved && saved.week === week ? saved.count + 1 : 1;
  storage.setItem(WEEKLY_GOAL_KEY, JSON.stringify({ week, count }));
  return count;
}
