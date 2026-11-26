// @vitest-environment happy-dom
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/bible/passage-client", () => ({
  prefetchPassages: () => {},
  peekPassage: () => null,
  loadPassageCached: () => Promise.resolve({ ok: false, message: "" }),
}));

vi.mock("@/components/FetchedPassage", () => ({
  FetchedPassage: () => null,
}));

import { QuestionSession } from "@/components/QuestionSession";
import { WeeklyGoalRing } from "@/components/WeeklyGoalRing";
import type { Question } from "@/lib/game/types";
import { TAP_GUARD_MS } from "@/lib/play/tap-guard";
import { weekStartLosAngeles } from "@/lib/account/week";
import {
  WEEKLY_GOAL,
  WEEKLY_GOAL_KEY,
  goalFill,
  readWeeklyCount,
  recordAnsweredQuestion,
  weeklyGoalWeek,
} from "@/lib/play/weekly-goal";

let root: Root | null = null;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

function mount(node: ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(node);
  });
  return container;
}

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

  it("still submits the answer when storage throws", async () => {
    vi.useFakeTimers();
    const blocked = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
      removeItem() {
        throw new Error("blocked");
      },
      clear() {
        throw new Error("blocked");
      },
      key() {
        return null;
      },
      length: 0,
    };
    const realStorage = window.localStorage;
    Object.defineProperty(window, "localStorage", { configurable: true, value: blocked });
    const onAttemptChange = vi.fn();
    try {
      const view = mount(
        createElement(QuestionSession, {
          question: sampleQuestion(),
          ageGroup: "adult",
          mascot: "judah",
          lines: [],
          soundOn: false,
          audioFiles: [],
          onAttemptChange,
          onContinue: () => undefined,
        }),
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(TAP_GUARD_MS);
      });
      const choice = view.querySelector('[data-testid="choice-a"]');
      if (!(choice instanceof HTMLButtonElement)) throw new Error("missing choice");
      act(() => {
        choice.click();
      });
      expect(onAttemptChange).toHaveBeenCalledTimes(1);
      expect(onAttemptChange.mock.calls[0]?.[0].phase).toBe("teaching");
    } finally {
      Object.defineProperty(window, "localStorage", { configurable: true, value: realStorage });
      vi.useRealTimers();
    }
  });
});

function sampleQuestion(): Question {
  return {
    id: "q1",
    cycle: 1,
    tier: "foundation",
    testament: "OT",
    book: "Genesis",
    section: "Creation",
    topics: ["sample"],
    placement_eligible: false,
    type: "multiple_choice",
    prompt: { adult: "Who made the world?" },
    choices: [
      { id: "a", text: "A neighbor" },
      { id: "b", text: "God" },
    ],
    answer: "b",
    teaching: {
      verses: [{ ref: "Genesis 1:1", text: "", translation: "NKJV" }],
      explanation: { adult: "The verse tells the story." },
      takeaway: "God made the world.",
    },
    review: { status: "draft", notes: "" },
  };
}
