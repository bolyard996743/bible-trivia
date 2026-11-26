// @vitest-environment happy-dom
import fs from "fs";
import path from "path";
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
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
import type { Question } from "@/lib/game/types";
import { COMBO_KEY, COMBO_MAX, applyCombo, comboLevel, readCombo, writeCombo } from "@/lib/play/combo";
import { TAP_GUARD_MS } from "@/lib/play/tap-guard";

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

function memory(initial: string | null = null) {
  let value = initial;
  return {
    getItem() {
      return value;
    },
    setItem(_key: string, next: string) {
      value = next;
    },
    raw() {
      return value;
    },
  };
}

describe("combo meter", () => {
  it("grows on correct answers, clears on a miss, and does not change a score", () => {
    expect(applyCombo(0, true)).toBe(1);
    expect(applyCombo(3, true)).toBe(4);
    expect(applyCombo(COMBO_MAX, true)).toBe(COMBO_MAX);
    expect(applyCombo(4, false)).toBe(0);
    expect(applyCombo(0, false)).toBe(0);
    expect(comboLevel(-3)).toBe(0);
    expect(comboLevel(Number.NaN)).toBe(0);
    expect(comboLevel(9)).toBe(COMBO_MAX);

    const storage = memory();
    expect(readCombo(storage)).toBe(0);
    expect(writeCombo(storage, applyCombo(0, true))).toBe(1);
    expect(writeCombo(storage, applyCombo(1, false))).toBe(0);
    expect(storage.raw()).toBe("0");
    expect(storage.raw()).not.toMatch(/miss|wrong|streak|points/i);
    storage.setItem(COMBO_KEY, "nope");
    expect(readCombo(storage)).toBe(0);

    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toContain('.question-card[data-combo="1"].bg-card');
    expect(css).toContain('.question-card[data-combo="6"].bg-card');
    expect(css).not.toMatch(/combo-break|combo-lost|combo-miss/);
    const allowed = css.slice(
      css.indexOf("@media (prefers-reduced-motion: no-preference)"),
      css.indexOf("@media (prefers-reduced-motion: reduce)"),
    );
    expect(allowed).toContain(".question-card");
    const reduced = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).toContain(".question-card");
    expect(reduced).toContain("animation: none");
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
