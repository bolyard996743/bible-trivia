// @vitest-environment happy-dom
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONFIRM_EMAIL_MESSAGE, EMAIL_REGISTERED, PASSWORD_RULE } from "@/lib/account/auth-errors";
import { CHILD_DEVICE_PROGRESS_NOTE, DEVICE_ONLY_PROGRESS_NOTE } from "@/lib/copy";
import type { StoredState } from "@/lib/storage";

const register = vi.hoisted(() => vi.fn());
const harness = vi.hoisted(() => {
  const guestState: StoredState = {
    version: 1,
    ageGroup: "adult",
    mascot: "judah",
    soundOn: true,
    placementComplete: true,
    placement: { cycle: 1, tier: "foundation", earned: 2, possible: 4, stage: "Seed" },
    progress: {
      cycle: 1,
      tier: "foundation",
      masteredIds: [],
      missCounts: {},
      streak: 0,
      bestStreak: 0,
      seasonMasteredCount: 0,
      stage: "Seed",
      seasonId: "season-1",
      clearedTopics: [],
      clearedBooks: [],
      firstTryIds: [],
      scoredIds: [],
      draw: 0,
      points: 0,
    },
    lastVisitedOn: null,
    celebration: null,
  };
  return {
    email: null as string | null,
    age: "adult" as StoredState["ageGroup"],
    under13: false,
    guestState,
  };
});

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children?: ReactNode }) =>
    createElement("a", { ...props, href }, children),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/results",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/use-profile", () => ({
  useProfile: () => ({ state: { ...harness.guestState, ageGroup: harness.age }, ready: true, save: vi.fn() }),
}));

vi.mock("@/lib/account/use-access", () => ({
  useSignedIn: () => ({ email: harness.email, ready: true, configured: true }),
  useAgeGate: () => ({
    value: { version: 1 as const, bracket: harness.age, under13: harness.under13 },
    ready: true,
  }),
}));

vi.mock("@/lib/account/register-account", () => ({
  registerWithPassword: (...args: unknown[]) => register(...args),
}));

import { ResultsClient } from "@/components/ResultsClient";
import { shouldShowDeviceOnlyCard, shouldShowSavePrompt } from "@/components/SaveProgressPrompt";

let root: Root | null = null;

function renderResults() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(createElement(ResultsClient, { questions: [], lines: [] }));
  });
  return container;
}

function promptText() {
  return document.querySelector("[data-testid=save-progress]")?.textContent ?? "";
}

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  document.body.innerHTML = "";
});

beforeEach(() => {
  register.mockReset();
  harness.email = null;
  harness.age = "adult";
  harness.under13 = false;
});

describe("save prompt on the placement result", () => {
  it("shows the prompt and the device note only for a guest", () => {
    renderResults();
    const prompt = document.querySelector("[data-testid=save-progress]");
    const note = document.querySelector("[data-testid=save-progress-note]");
    const skip = document.querySelector("[data-testid=save-progress-skip]");
    expect(prompt).not.toBeNull();
    expect(note?.textContent).toBe(DEVICE_ONLY_PROGRESS_NOTE);
    expect(note?.textContent).toBe(
      "Without an account, your progress stays only on this device. Clearing your browser data or switching devices will erase it.",
    );
    expect(note?.parentElement).toBe(skip?.parentElement);
    expect(document.querySelector("[data-testid=save-progress-email]")).not.toBeNull();
    expect(document.querySelector("[data-testid=save-progress-password]")).not.toBeNull();
    expect(document.querySelector("[data-testid=save-progress-submit]")?.textContent).toBe("Create account");
    expect(skip?.textContent).toBe("Not now");
    expect(document.querySelector("[data-testid=save-progress-sign-in]")?.getAttribute("href")).toBe("/account?mode=sign-in");
    expect(document.querySelector("[data-testid=birth-month]")).toBeNull();

    const html = document.body.innerHTML;
    expect(html.indexOf('data-testid="starting-place"')).toBeLessThan(html.indexOf('data-testid="save-progress"'));
    expect(html.indexOf('data-testid="save-progress"')).toBeLessThan(html.indexOf("Go to your path"));

    const lowered = promptText().toLowerCase();
    for (const word of ["difficulty", "tier", "teen", "child", "sprout", "rooted", "growing", "established", "fruitful", "deep roots"]) {
      expect(lowered).not.toContain(word);
    }
  });

  it("hides the prompt for a signed-in player", () => {
    harness.email = "member@example.com";
    renderResults();
    expect(document.querySelector("[data-testid=save-progress]")).toBeNull();
    expect(document.querySelector("[data-testid=device-only-progress]")).toBeNull();
    expect(document.body.textContent).toContain("Go to your path");
    expect(document.body.textContent).toContain("Your starting place");
    expect(shouldShowSavePrompt({ signedIn: true, dismissed: false, age: "adult", status: "form" })).toBe(false);
    expect(shouldShowSavePrompt({ signedIn: false, dismissed: true, age: "adult", status: "form" })).toBe(false);
    expect(shouldShowSavePrompt({ signedIn: false, dismissed: false, age: "adult", status: "form" })).toBe(true);
    expect(shouldShowDeviceOnlyCard({ signedIn: true, age: "child" })).toBe(false);
  });

  it("shows an under-13 guest only the device warning, and a 13+ guest the full prompt", () => {
    harness.age = "child";
    harness.under13 = true;
    renderResults();
    const card = document.querySelector("[data-testid=device-only-progress]");
    expect(card?.textContent).toBe(CHILD_DEVICE_PROGRESS_NOTE);
    expect(card?.textContent).toBe(
      "Your progress stays only on this device. Clearing your browser data or switching devices will erase it.",
    );
    expect(card?.textContent?.toLowerCase()).not.toContain("age");
    expect(document.querySelector("[data-testid=save-progress]")).toBeNull();
    expect(document.querySelector("[data-testid=save-progress-email]")).toBeNull();
    expect(document.querySelector("[data-testid=save-progress-password]")).toBeNull();
    expect(document.querySelector("[data-testid=save-progress-submit]")).toBeNull();
    expect(document.querySelector("[data-testid=save-progress-skip]")).toBeNull();
    expect(document.querySelector("[data-testid=save-progress-sign-in]")).toBeNull();
    expect(document.querySelector('a[href="/account?mode=sign-in"]')).toBeNull();
    expect(document.body.textContent).toContain("Go to your path");

    act(() => root?.unmount());
    document.body.innerHTML = "";
    harness.age = "adult";
    harness.under13 = false;
    renderResults();
    expect(document.querySelector("[data-testid=device-only-progress]")).toBeNull();
    expect(document.querySelector("[data-testid=save-progress-email]")).not.toBeNull();
    expect(document.querySelector("[data-testid=save-progress-password]")).not.toBeNull();
    expect(document.querySelector("[data-testid=save-progress-submit]")?.textContent).toBe("Create account");
    expect(document.querySelector("[data-testid=save-progress-sign-in]")?.getAttribute("href")).toBe("/account?mode=sign-in");
    expect(document.querySelector("[data-testid=save-progress-note]")?.textContent).toBe(DEVICE_ONLY_PROGRESS_NOTE);
  });

  it("hides the prompt when Not now is chosen and leaves the path in place", () => {
    renderResults();
    const skip = document.querySelector<HTMLButtonElement>("[data-testid=save-progress-skip]");
    act(() => {
      skip?.click();
    });
    expect(document.querySelector("[data-testid=save-progress]")).toBeNull();
    expect(document.querySelector("[data-testid=save-progress-note]")).toBeNull();
    expect(document.querySelector("[data-testid=starting-place]")).not.toBeNull();
    const next = document.querySelector<HTMLAnchorElement>('a[href="/home"]');
    expect(next?.textContent).toBe("Go to your path");
  });

  it("shows a weak password, an email already in use, confirmation, and a saved account", async () => {
    register.mockResolvedValue({ status: "invalid", message: PASSWORD_RULE });
    renderResults();
    await fillAndSubmit();
    expect(document.querySelector("[data-testid=save-progress-message]")?.textContent).toBe(PASSWORD_RULE);
    expect(register).toHaveBeenCalledWith({ email: "guest@example.com", password: "longpassword1" });

    register.mockResolvedValue({ status: "invalid", message: EMAIL_REGISTERED });
    await fillAndSubmit();
    expect(document.querySelector("[data-testid=save-progress-message]")?.textContent).toBe(EMAIL_REGISTERED);

    register.mockResolvedValue({ status: "confirmation", email: "guest@example.com" });
    await fillAndSubmit();
    expect(document.querySelector("[data-testid=save-progress-confirm]")?.textContent).toContain(CONFIRM_EMAIL_MESSAGE);
    expect(document.querySelector("[data-testid=save-progress-email]")).toBeNull();
    expect(document.querySelector("[data-testid=save-progress-note]")).toBeNull();

    act(() => root?.unmount());
    document.body.innerHTML = "";
    register.mockResolvedValue({ status: "ready" });
    renderResults();
    await fillAndSubmit();
    expect(document.querySelector("[data-testid=save-progress-ready]")?.textContent).toContain(
      "Your progress is saved with your account.",
    );
    expect(document.querySelector('a[href="/home"]')?.textContent).toBe("Go to your path");
  });
});

async function fillAndSubmit() {
  const email = document.querySelector<HTMLInputElement>("[data-testid=save-progress-email]");
  const password = document.querySelector<HTMLInputElement>("[data-testid=save-progress-password]");
  if (!email || !password) throw new Error("form missing");
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  await act(async () => {
    setValue?.call(email, "guest@example.com");
    email.dispatchEvent(new Event("input", { bubbles: true }));
    setValue?.call(password, "longpassword1");
    password.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const submit = document.querySelector<HTMLButtonElement>("[data-testid=save-progress-submit]");
  await act(async () => {
    submit?.click();
  });
}
