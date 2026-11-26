// @vitest-environment happy-dom
import fs from "fs";
import path from "path";
import { createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { countCatalogBadges, countEarnedBadges, badgeProgressRatio, badgesEarnedLabel } from "@/lib/game/badges";
import { openAttemptCorrectIds, recordBadgeAnswer } from "@/lib/game/badge-retry";
import { emptyProgress } from "@/lib/game/progression";
import { knowledgePath, type KnowledgePathFile, type PathBadge } from "@/lib/game/path";
import {
  ADVANCE_MS,
  PAUSE_RESUME_MS,
  advanceDuration,
  consumeAdvance,
  elapsedAt,
  fillRatio,
  missHold,
  nextQuestionCountdown,
  pauseForReading,
  schedulesAutoAdvance,
  skipAdvance,
  startCorrectAdvance,
  tick,
  wakeDelay,
} from "@/lib/play/advance-clock";
import { playFeedbackTone, shouldPlayFeedback, type FeedbackAudio } from "@/lib/play/feedback-sound";
import { badgeStreakDisplay, streakIsVisible } from "@/lib/play/streak";
import { TAP_GUARD_MS, acceptGuardedTap } from "@/lib/play/tap-guard";
import type { MascotLine, Question } from "@/lib/game/types";

vi.mock("@/lib/bible/passage-client", () => ({
  prefetchPassages: () => {},
  peekPassage: () => null,
  loadPassageCached: () => Promise.resolve({ ok: false, message: "" }),
}));

vi.mock("@/components/FetchedPassage", () => ({
  FetchedPassage: ({ reference }: { reference: string }) => createElement("p", { "data-testid": "verse" }, reference),
}));

import { BadgeEarnedBar } from "@/components/BadgeEarnedBar";
import { QuestionSession } from "@/components/QuestionSession";

const lines: MascotLine[] = [
  {
    id: "wrong",
    mascot: "judah",
    moment: "wrong_intro",
    audience: "all",
    text: "Let's look together.",
    audio_file: null,
    question_id: null,
  },
  {
    id: "right",
    mascot: "judah",
    moment: "correct",
    audience: "all",
    text: "Yes.",
    audio_file: null,
    question_id: null,
  },
];

function question(): Question {
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
      verses: [{ ref: "Genesis 1:1", text: "In the beginning God created the heavens and the earth.", translation: "NKJV" }],
      explanation: { adult: "The verse tells the story." },
      takeaway: "God made the world.",
    },
    review: { status: "draft", notes: "" },
  };
}

function fakeAudio(): { context: FeedbackAudio; calls: string[] } {
  const calls: string[] = [];
  const context: FeedbackAudio = {
    currentTime: 0,
    destination: {},
    createOscillator: () => {
      calls.push("osc");
      return {
        type: "sine",
        frequency: {
          setValueAtTime: () => calls.push("freq"),
          linearRampToValueAtTime: () => undefined,
          exponentialRampToValueAtTime: () => undefined,
        },
        connect: () => undefined,
        start: () => calls.push("start"),
        stop: () => undefined,
      };
    },
    createGain: () => ({
      gain: {
        setValueAtTime: () => undefined,
        linearRampToValueAtTime: () => undefined,
        exponentialRampToValueAtTime: () => undefined,
      },
      connect: () => undefined,
    }),
  };
  return { context, calls };
}

let root: Root | null = null;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

function render(node: ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(node);
  });
  return container;
}

function button(container: ParentNode, testId: string) {
  const node = container.querySelector(`[data-testid="${testId}"]`);
  if (!(node instanceof HTMLButtonElement)) throw new Error(`missing ${testId}`);
  return node;
}

function click(container: ParentNode, testId: string) {
  const node = button(container, testId);
  act(() => {
    node.click();
  });
  return node;
}

function clickTwice(container: ParentNode, testId: string) {
  const node = button(container, testId);
  act(() => {
    node.click();
    node.click();
  });
}

afterEach(() => {
  vi.useRealTimers();
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

describe("mis-tap guard", () => {
  it("ignores taps for 600ms and then accepts one", () => {
    expect(TAP_GUARD_MS).toBe(600);
    const shownAt = 1_000;
    expect(acceptGuardedTap({ now: shownAt, shownAt, alreadySubmitted: false }).accepted).toBe(false);
    expect(acceptGuardedTap({ now: shownAt + 599, shownAt, alreadySubmitted: false }).accepted).toBe(false);
    expect(acceptGuardedTap({ now: shownAt + 600, shownAt, alreadySubmitted: false })).toEqual({
      accepted: true,
      submitted: true,
    });
  });

  it("accepts the first answer and ignores a second tap", () => {
    const first = acceptGuardedTap({ now: 600, shownAt: 0, alreadySubmitted: false });
    const second = acceptGuardedTap({ now: 610, shownAt: 0, alreadySubmitted: first.submitted });
    expect(first.accepted).toBe(true);
    expect(second).toEqual({ accepted: false, submitted: true });
  });

  it("keeps answer buttons looking enabled, then blocks a double submit", async () => {
    vi.useFakeTimers();
    const onAttemptChange = vi.fn();
    const container = render(
      createElement(QuestionSession, {
        question: question(),
        ageGroup: "adult",
        mascot: "judah",
        lines,
        soundOn: false,
        audioFiles: [],
        onAttemptChange,
        onContinue: () => undefined,
      }),
    );
    const first = button(container, "choice-a");
    expect(first.disabled).toBe(false);
    expect(first.className).toContain("tap-guard");
    expect(first.className.split(/\s+/).some((name) => name.startsWith("opacity"))).toBe(false);

    act(() => {
      first.click();
    });
    expect(onAttemptChange).not.toHaveBeenCalled();
    expect(button(container, "choice-a").disabled).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(599);
    });
    act(() => {
      button(container, "choice-a").click();
    });
    expect(onAttemptChange).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    clickTwice(container, "choice-a");
    expect(onAttemptChange).toHaveBeenCalledTimes(1);
    expect(container.querySelector("[data-testid='teaching']")).not.toBeNull();
    expect(container.querySelector("[data-testid='ichthys-timer']")).toBeNull();
  });

  it("ignores Continue for 600ms after a miss and never auto-advances", async () => {
    vi.useFakeTimers();
    const onContinue = vi.fn();
    const container = render(
      createElement(QuestionSession, {
        question: question(),
        ageGroup: "adult",
        mascot: "judah",
        lines,
        soundOn: false,
        audioFiles: [],
        closeOnMiss: true,
        onContinue,
      }),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TAP_GUARD_MS);
    });
    click(container, "choice-a");
    const teaching = container.querySelector("[data-testid='teaching']");
    expect(teaching).not.toBeNull();
    expect(container.querySelector("[data-testid='ichthys-timer']")).toBeNull();
    expect(container.querySelector("[data-testid='verse']")?.textContent).toContain("Genesis 1:1");
    expect(teaching?.textContent).not.toContain("A neighbor");
    const continueButton = button(container, "badge-miss-continue");
    expect(continueButton.textContent).toBe("Continue");
    expect(continueButton.className).toContain("tap-guard");
    expect(continueButton.disabled).toBe(false);

    act(() => {
      continueButton.click();
    });
    expect(onContinue).not.toHaveBeenCalled();
    expect(container.querySelector("[data-testid='teaching']")).not.toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    expect(onContinue).not.toHaveBeenCalled();
    expect(container.querySelector("[data-testid='ichthys-timer']")).toBeNull();

    clickTwice(container, "badge-miss-continue");
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onContinue.mock.calls[0]?.[0]).toMatchObject({ firstAttemptCorrect: false, missCount: 1 });
  });

  it("returns to the same question after a miss and guards the next tap", async () => {
    vi.useFakeTimers();
    const onContinue = vi.fn();
    const container = render(
      createElement(QuestionSession, {
        question: question(),
        ageGroup: "adult",
        mascot: "judah",
        lines,
        soundOn: false,
        audioFiles: [],
        onContinue,
      }),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TAP_GUARD_MS);
    });
    click(container, "choice-a");
    expect(container.querySelector("[data-testid='ichthys-timer']")).toBeNull();
    expect(container.querySelector("[data-testid='ready-button']")?.textContent).toBe("I'm ready");
    const outside = container.querySelector("[data-testid='teaching']");
    const copy = outside?.cloneNode(true) as HTMLElement | undefined;
    copy?.querySelectorAll("[data-testid='verse']").forEach((node) => node.remove());
    expect(copy?.textContent ?? "").not.toContain("God");

    act(() => {
      button(container, "ready-button").click();
    });
    expect(container.querySelector("[data-testid='prompt']")).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TAP_GUARD_MS);
    });
    click(container, "ready-button");
    const retry = button(container, "choice-b");
    expect(retry.disabled).toBe(false);
    expect(retry.className).toContain("tap-guard");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    expect(onContinue).not.toHaveBeenCalled();
    expect(container.querySelector("[data-testid='ichthys-timer']")).toBeNull();
  });
});

describe("correct-answer advance", () => {
  it("advances a correct answer at 15s and never advances a miss", () => {
    expect(ADVANCE_MS).toBe(15_000);
    expect(schedulesAutoAdvance("mastered")).toBe(true);
    expect(schedulesAutoAdvance("teaching")).toBe(false);
    expect(schedulesAutoAdvance("asking")).toBe(false);
    expect(advanceDuration(true)).toBe(advanceDuration(false));

    let miss = missHold();
    miss = tick(miss, ADVANCE_MS);
    miss = skipAdvance(miss);
    expect(miss.advanced).toBe(false);
    expect(consumeAdvance(miss).fire).toBe(false);

    let clock = startCorrectAdvance(0, false);
    clock = tick(clock, ADVANCE_MS - 1);
    expect(clock.advanced).toBe(false);
    clock = tick(clock, ADVANCE_MS);
    const first = consumeAdvance(clock);
    const second = consumeAdvance(first.clock);
    expect(first.fire).toBe(true);
    expect(second.fire).toBe(false);
  });

  it("pauses while the verse is read, resumes after 3s without jumping, and skip moves on once", () => {
    expect(PAUSE_RESUME_MS).toBe(3_000);
    let clock = startCorrectAdvance(0, false);
    clock = pauseForReading(clock, 4_000);
    expect(elapsedAt(clock, 4_000)).toBe(4_000);
    expect(elapsedAt(clock, 6_900)).toBe(4_000);
    expect(fillRatio(clock, 6_900)).toBeCloseTo(4_000 / ADVANCE_MS);
    expect(wakeDelay(clock, 4_000, false)).toBe(PAUSE_RESUME_MS);
    clock = tick(clock, 6_999);
    expect(clock.running).toBe(false);
    expect(clock.advanced).toBe(false);
    clock = tick(clock, 7_000);
    expect(clock.running).toBe(true);
    expect(elapsedAt(clock, 7_000)).toBe(4_000);
    expect(elapsedAt(clock, 9_000)).toBe(6_000);

    clock = pauseForReading(clock, 9_000);
    const skipped = skipAdvance(clock);
    const once = consumeAdvance(skipped);
    expect(once.fire).toBe(true);
    expect(consumeAdvance(once.clock).fire).toBe(false);
  });

  it("auto-advances 15s after a correct answer, pauses, and does not advance twice", async () => {
    vi.useFakeTimers();
    const onContinue = vi.fn();
    const container = render(
      createElement(QuestionSession, {
        question: question(),
        ageGroup: "adult",
        mascot: "judah",
        lines,
        soundOn: false,
        audioFiles: [],
        onContinue,
      }),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TAP_GUARD_MS);
    });
    click(container, "choice-b");
    expect(container.querySelector("[data-testid='ichthys-timer']")).not.toBeNull();
    const fill = container.querySelector(".ichthys-fill");
    expect(fill).not.toBeNull();
    expect((fill as HTMLElement).style.animationDuration).toBe(`${ADVANCE_MS}ms`);
    expect(container.querySelector("[data-testid='correct-panel']")).not.toBeNull();
    expect(container.getAttribute("data-auto-advance") ?? container.querySelector("[data-auto-advance='true']")).not.toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ADVANCE_MS - 1);
    });
    expect(onContinue).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onContinue.mock.calls[0]?.[0]).toMatchObject({ firstAttemptCorrect: true, missCount: 0 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ADVANCE_MS);
    });
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("pauses the fish when the reveal area scrolls and Continue skips once", async () => {
    vi.useFakeTimers();
    const onContinue = vi.fn();
    const container = render(
      createElement(QuestionSession, {
        question: question(),
        ageGroup: "adult",
        mascot: "judah",
        lines,
        soundOn: false,
        audioFiles: [],
        onContinue,
      }),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TAP_GUARD_MS);
    });
    click(container, "choice-b");
    const reveal = container.querySelector("[data-testid='reveal-area']");
    if (!(reveal instanceof HTMLElement)) throw new Error("missing reveal");
    act(() => {
      reveal.dispatchEvent(new Event("scroll"));
    });
    expect(container.querySelector("[data-testid='ichthys-timer']")?.getAttribute("data-paused")).toBe("true");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ADVANCE_MS);
    });
    expect(onContinue).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PAUSE_RESUME_MS);
    });
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("skips the wait from Continue and cleans up on unmount", async () => {
    vi.useFakeTimers();
    const onContinue = vi.fn();
    const container = render(
      createElement(QuestionSession, {
        question: question(),
        ageGroup: "adult",
        mascot: "judah",
        lines,
        soundOn: false,
        audioFiles: [],
        onContinue,
      }),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TAP_GUARD_MS);
    });
    click(container, "choice-b");
    click(container, "continue-button");
    click(container, "continue-button");
    expect(onContinue).toHaveBeenCalledTimes(1);

    act(() => root?.unmount());
    root = null;
    onContinue.mockClear();
    const second = render(
      createElement(QuestionSession, {
        question: question(),
        ageGroup: "adult",
        mascot: "judah",
        lines,
        soundOn: false,
        audioFiles: [],
        onContinue,
      }),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TAP_GUARD_MS);
    });
    click(second, "choice-b");
    act(() => root?.unmount());
    root = null;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ADVANCE_MS + 1_000);
    });
    expect(onContinue).not.toHaveBeenCalled();
  });

  it("uses a static fish and the same 15s countdown when motion is reduced", async () => {
    vi.useFakeTimers();
    window.matchMedia = ((query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
    const onContinue = vi.fn();
    const container = render(
      createElement(QuestionSession, {
        question: question(),
        ageGroup: "adult",
        mascot: "judah",
        lines,
        soundOn: false,
        audioFiles: [],
        onContinue,
      }),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TAP_GUARD_MS);
    });
    click(container, "choice-b");
    const timer = container.querySelector("[data-testid='ichthys-timer']");
    expect(timer?.getAttribute("data-reduced")).toBe("true");
    expect(container.querySelector(".ichthys-fill")).toBeNull();
    expect(container.querySelector("[data-testid='advance-countdown']")?.textContent).toBe(nextQuestionCountdown(ADVANCE_MS / 1000));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(container.querySelector("[data-testid='advance-countdown']")?.textContent).toBe(nextQuestionCountdown(ADVANCE_MS / 1000 - 1));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ADVANCE_MS - 1_000);
    });
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});

describe("badge streak", () => {
  const badge: PathBadge = {
    id: "sample-badge",
    name: "Sample",
    art: "lamp",
    questionIds: ["q1", "q2"],
  };

  it("grows on a correct answer and disappears when a miss resets it", () => {
    const now = new Date("2026-11-26T12:00:00.000Z");
    const progress = emptyProgress();
    expect(streakIsVisible(badgeStreakDisplay({ correctIds: [], questionId: "q1", phase: "asking" }))).toBe(false);
    const correct = recordBadgeAnswer(progress, badge, "q1", true, now);
    const ids = openAttemptCorrectIds(correct, badge.id);
    expect(badgeStreakDisplay({ correctIds: ids, questionId: "q2", phase: "asking" })).toBe(1);
    expect(
      badgeStreakDisplay({ correctIds: ids, questionId: "q2", phase: "mastered" }),
    ).toBe(2);
    const missed = recordBadgeAnswer(correct, badge, "q2", false, now);
    const cleared = openAttemptCorrectIds(missed, badge.id);
    expect(cleared).toEqual([]);
    expect(badgeStreakDisplay({ correctIds: cleared, questionId: "q2", phase: "teaching" })).toBe(0);
    expect(streakIsVisible(0)).toBe(false);
  });

  it("shows the flame during a badge attempt and removes it after a miss", async () => {
    vi.useFakeTimers();
    const container = render(
      createElement(QuestionSession, {
        question: question(),
        ageGroup: "adult",
        mascot: "judah",
        lines,
        soundOn: false,
        audioFiles: [],
        attemptCorrectIds: ["earlier"],
        onContinue: () => undefined,
      }),
    );
    expect(container.querySelector("[data-testid='attempt-streak']")?.getAttribute("aria-label")).toBe(
      "1 correct in a row",
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TAP_GUARD_MS);
    });
    click(container, "choice-a");
    expect(container.querySelector("[data-testid='attempt-streak']")).toBeNull();
    expect(container.textContent).not.toMatch(/lost|broken|wrong streak|try harder/i);
  });
});

describe("sound toggle", () => {
  it("stays silent when sound is off and plays when sound is on", () => {
    const { context, calls } = fakeAudio();
    expect(shouldPlayFeedback(false)).toBe(false);
    expect(playFeedbackTone("correct", false, context)).toBe(false);
    expect(playFeedbackTone("miss", false, null)).toBe(false);
    expect(calls).toEqual([]);
    expect(playFeedbackTone("correct", true, context)).toBe(true);
    expect(playFeedbackTone("miss", true, context)).toBe(true);
    expect(calls).toContain("osc");
    expect(calls).toContain("start");
  });
});

describe("badges earned X/N", () => {
  it("counts N from the catalog file and X from earned badges", () => {
    const file = JSON.parse(fs.readFileSync(path.join(process.cwd(), "content/knowledge_path.json"), "utf8")) as {
      stages: { badges: unknown[] }[];
    };
    const fromFile = file.stages.reduce((sum, stage) => sum + stage.badges.length, 0);
    expect(countCatalogBadges()).toBe(fromFile);
    expect(countEarnedBadges(emptyProgress())).toBe(0);

    const sample = knowledgePath.stages.flatMap((stage) => stage.badges).find((badge) => badge.questionIds.length > 0);
    if (!sample) throw new Error("catalog has no badge with questions");
    const earned = {
      ...emptyProgress(),
      badgeRetries: { [sample.id]: { correctIds: [...sample.questionIds] } },
    };
    expect(countEarnedBadges(earned)).toBe(1);
    expect(badgesEarnedLabel(1, fromFile)).toBe(`Badges earned 1/${fromFile}`);

    const fixture: KnowledgePathFile = {
      version: 1,
      advanceRule: "every-badge",
      stages: [
        {
          stage: "Seed",
          books: [],
          badges: [
            { id: "one", name: "One", art: "lamp", questionIds: ["q"] },
            { id: "empty", name: "Empty", art: "lamp", questionIds: [] },
          ],
        },
      ],
    };
    expect(countCatalogBadges(fixture)).toBe(2);
    expect(countEarnedBadges(emptyProgress(), fixture)).toBe(0);
    const one = {
      ...emptyProgress(),
      badgeRetries: { one: { correctIds: ["q"] } },
    };
    expect(countEarnedBadges(one, fixture)).toBe(1);
    expect(badgeProgressRatio(1, 2)).toBe(0.5);
    expect(badgeProgressRatio(0, 0)).toBe(0);

    const home = fs.readFileSync(path.join(process.cwd(), "src/components/HomeClient.tsx"), "utf8");
    expect(home).toContain("countCatalogBadges()");
    expect(home).toContain("countEarnedBadges(");
    expect(home).not.toContain("218");

    const html = render(
      createElement(BadgeEarnedBar, { earned: countEarnedBadges(emptyProgress()), total: countCatalogBadges() }),
    );
    expect(html.querySelector("[data-testid='badge-progress']")?.textContent).toBe(`Badges earned 0/${fromFile}`);
    const bar = html.querySelector("[role='progressbar']");
    expect(bar?.getAttribute("aria-valuemax")).toBe(String(fromFile));
    expect(bar?.getAttribute("aria-valuenow")).toBe("0");
  });
});
