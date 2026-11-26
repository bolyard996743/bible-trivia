// @vitest-environment happy-dom
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {} }),
}));

vi.mock("@/lib/use-profile", () => ({
  useProfile: () => ({ state: null, ready: true }),
}));

vi.mock("@/lib/account/use-access", () => ({
  useAgeGate: () => ({ value: { version: 1, bracket: "adult", under13: false }, ready: true }),
  useSignedIn: () => ({ email: null, ready: true, configured: false }),
}));

import { HapticsToggle } from "@/components/HapticsToggle";
import { ProfileEditor } from "@/components/ProfileEditor";
import {
  HAPTICS_KEY,
  buzz,
  buzzForAnswer,
  buzzForBadge,
  hapticsEnabled,
  writeHapticsEnabled,
  type Vibrator,
} from "@/lib/play/haptics";

function memory(initial: string | null = null) {
  let value = initial;
  return {
    getItem() {
      return value;
    },
    setItem(_key: string, next: string) {
      value = next;
    },
  };
}

function fakeNav(impl?: (pattern: number | number[]) => boolean): { nav: Vibrator; calls: Array<number | number[]> } {
  const calls: Array<number | number[]> = [];
  return {
    calls,
    nav: {
      vibrate: (pattern) => {
        calls.push(pattern);
        return impl ? impl(pattern) : true;
      },
    },
  };
}

let root: Root | null = null;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.localStorage.clear();
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = "";
  window.localStorage.clear();
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

describe("haptics", () => {
  it("is on by default and stays quiet when turned off or unsupported", () => {
    const storage = memory();
    expect(hapticsEnabled(storage)).toBe(true);
    writeHapticsEnabled(storage, false);
    expect(hapticsEnabled(storage)).toBe(false);
    expect(storage.getItem()).toBe("off");
    writeHapticsEnabled(storage, true);
    expect(hapticsEnabled(storage)).toBe(true);

    const correct = fakeNav();
    expect(buzz("correct", true, correct.nav)).toBe(true);
    expect(correct.calls).toEqual([15]);
    const earned = fakeNav();
    expect(buzzForBadge(memory("on"), earned.nav)).toBe(true);
    expect(earned.calls).toEqual([[15, 40, 20]]);

    expect(buzzForAnswer(false, memory(), correct.nav)).toBe(false);
    expect(correct.calls).toEqual([15]);
    expect(buzzForAnswer(true, memory("off"), correct.nav)).toBe(false);
    expect(buzz("correct", true, {})).toBe(false);
    expect(buzz("correct", true, null)).toBe(false);
    expect(buzz("badge", true, { vibrate: () => false })).toBe(false);
    expect(
      buzz("correct", true, {
        vibrate: () => {
          throw new Error("unsupported");
        },
      }),
    ).toBe(false);
    expect(HAPTICS_KEY).toBe("bible-trivia-v1:haptics");
  });

  it("toggles vibration in Settings and leaves mentor setup without the switch", () => {
    const view = mount(createElement(HapticsToggle));
    const button = view.querySelector('[data-testid="haptics-toggle"]');
    if (!(button instanceof HTMLButtonElement)) throw new Error("missing vibration switch");
    expect(button.getAttribute("aria-checked")).toBe("true");
    expect(button.textContent).toBe("On");
    act(() => {
      button.click();
    });
    expect(button.getAttribute("aria-checked")).toBe("false");
    expect(window.localStorage.getItem(HAPTICS_KEY)).toBe("off");
    expect(hapticsEnabled(window.localStorage)).toBe(false);

    act(() => root?.unmount());
    root = null;
    document.body.innerHTML = "";
    const settings = mount(createElement(ProfileEditor, { lines: [], audioFiles: [], mode: "settings" }));
    expect(settings.querySelector('[data-testid="haptics-toggle"]')).toBeTruthy();
    expect(settings.textContent).toContain("Vibration");

    const setup = renderToStaticMarkup(createElement(ProfileEditor, { lines: [], audioFiles: [], mode: "setup" }));
    expect(setup).not.toContain("haptics-toggle");
    expect(setup).not.toContain("Vibration");
  });
});
