import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { WeeklyGoalRing } from "@/components/WeeklyGoalRing";
import { weekStartLosAngeles } from "@/lib/account/week";
import {
  WEEKLY_GOAL,
  WEEKLY_GOAL_KEY,
  goalFill,
  readWeeklyCount,
  recordAnsweredQuestion,
  weeklyGoalWeek,
} from "@/lib/play/weekly-goal";

function memory() {
  const bag = new Map<string, string>();
  return {
    getItem(key: string) {
      return bag.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      bag.set(key, value);
    },
  };
}

describe("weekly goal ring", () => {
  it("counts answered questions and resets at Monday 00:00 America/Los_Angeles", () => {
    const storage = memory();
    const before = new Date("2026-11-02T07:59:59.999Z");
    const monday = new Date("2026-11-02T08:00:00.000Z");
    expect(weeklyGoalWeek(monday)).toBe(weekStartLosAngeles(monday).toISOString());
    expect(weeklyGoalWeek(before)).not.toBe(weeklyGoalWeek(monday));

    expect(recordAnsweredQuestion(storage, before)).toBe(1);
    expect(recordAnsweredQuestion(storage, before)).toBe(2);
    expect(readWeeklyCount(storage, before)).toBe(2);
    expect(readWeeklyCount(storage, monday)).toBe(0);
    expect(recordAnsweredQuestion(storage, monday)).toBe(1);
    expect(readWeeklyCount(storage, before)).toBe(0);
    expect(readWeeklyCount(storage, new Date("2026-11-08T20:00:00.000Z"))).toBe(1);

    storage.setItem(WEEKLY_GOAL_KEY, "not-json");
    expect(readWeeklyCount(storage, monday)).toBe(0);
    expect(goalFill(0)).toBe(0);
    expect(goalFill(25)).toBe(0.5);
    expect(goalFill(WEEKLY_GOAL)).toBe(1);
    expect(goalFill(80)).toBe(1);

    const html = renderToStaticMarkup(createElement(WeeklyGoalRing, { count: 25, reducedMotion: true }));
    expect(html).toContain('data-testid="weekly-goal"');
    expect(html).toContain('data-fill="0.50"');
    expect(html).toContain("25 of 50");
    expect(html).toContain("questions this week");
    expect(html).toContain('data-reduced="true"');
    expect(html).not.toMatch(/behind|failed|missed the goal/i);

    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    const reduced = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).toContain(".weekly-goal-ring circle");
    expect(reduced).toContain("transition: none");
  });
});
