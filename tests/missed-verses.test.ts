// @vitest-environment happy-dom
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children?: ReactNode }) =>
    createElement("a", { ...props, href }, children),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/verses",
  useRouter: () => ({ push: () => {}, replace: () => {} }),
}));

vi.mock("@/lib/use-profile", () => ({
  useProfile: () => ({ state: { ageGroup: "adult", placementComplete: true }, ready: true }),
}));

vi.mock("@/lib/account/use-access", () => ({
  useAgeGate: () => ({ value: { version: 1, bracket: "adult", under13: false }, ready: true }),
  useSignedIn: () => ({ email: null, ready: true, configured: false }),
}));

const passage = {
  ref: "John 11:35",
  bookId: "JHN",
  chapter: 11,
  verseStart: 35,
  verseEnd: 35,
  verses: [{ bookId: "JHN", chapter: 11, verse: 35, text: "Jesus wept." }],
  copyright:
    "Scripture taken from the New King James Version®. Copyright © 1982 by Thomas Nelson. Used by permission. All rights reserved.",
  fumsToken: "fums-sample-token",
};

vi.mock("@/lib/bible/passage-client", () => ({
  peekPassage: () => passage,
  prefetchPassages: () => {},
  loadPassageCached: () => Promise.resolve({ ok: true, data: passage }),
}));

import { MainNav } from "@/components/MainNav";
import { MyVersesClient } from "@/components/MyVersesClient";
import { NKJV_COPYRIGHT } from "@/lib/bible/notice";
import { addMissedVerses, MISSED_VERSES_KEY, readMissedVerses, verseReference, writeMissedVerses } from "@/lib/play/missed-verses";

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

describe("missed verses", () => {
  it("stores verse references only, newest first, and drops questions and answers", () => {
    expect(verseReference("John 11:35")).toBe("John 11:35");
    expect(verseReference("1 Corinthians 13:4-7")).toBe("1 Corinthians 13:4-7");
    expect(verseReference("Who was the first man?")).toBeNull();
    expect(verseReference("Adam")).toBeNull();
    expect(verseReference("The correct answer is Moses")).toBeNull();

    const first = addMissedVerses([], ["John 11:35", "Who was the first man?", "John 11:35"]);
    expect(first).toEqual(["John 11:35"]);
    const next = addMissedVerses(first, ["Genesis 1:1", "Adam"]);
    expect(next).toEqual(["Genesis 1:1", "John 11:35"]);
    expect(addMissedVerses(next, ["John 11:35"])).toEqual(["John 11:35", "Genesis 1:1"]);

    const storage = {
      raw: null as string | null,
      getItem() {
        return this.raw;
      },
      setItem(_key: string, value: string) {
        this.raw = value;
      },
    };
    writeMissedVerses(storage, ["John 11:35", "choice: the serpent"]);
    expect(JSON.parse(storage.raw ?? "[]")).toEqual(["John 11:35"]);
    expect(storage.raw).not.toMatch(/serpent|correct|choice/i);
    storage.raw = JSON.stringify(["Not a verse", "Psalm 23:1", { prompt: "hidden" }]);
    expect(readMissedVerses(storage)).toEqual(["Psalm 23:1"]);
    storage.raw = "{";
    expect(readMissedVerses(storage)).toEqual([]);
  });

  it("lists the saved reference with the NKJV notice and API.Bible line, and links it from the menu", () => {
    window.localStorage.setItem(
      MISSED_VERSES_KEY,
      JSON.stringify(["John 11:35", "Who built the ark?", "Noah"]),
    );
    const page = mount(createElement(MyVersesClient));
    expect(page.querySelectorAll('[data-testid="my-verse"]').length).toBe(1);
    expect(page.textContent).toContain("John 11:35");
    expect(page.textContent).toContain("Jesus wept.");
    expect(page.textContent).toContain("NKJV");
    expect(page.innerHTML).toContain("Thomas Nelson");
    expect(page.innerHTML).toContain("API.Bible");
    expect(page.innerHTML).toContain('data-testid="scripture-notice"');
    expect(page.textContent).not.toContain("Who built the ark?");
    expect(page.textContent).not.toContain("Noah");
    expect(NKJV_COPYRIGHT).toMatch(/New King James/);

    act(() => root?.unmount());
    root = null;
    document.body.innerHTML = "";
    window.localStorage.removeItem(MISSED_VERSES_KEY);
    const empty = mount(createElement(MyVersesClient));
    expect(empty.querySelector('[data-testid="my-verses-empty"]')?.textContent).toMatch(/miss/i);
    expect(empty.textContent).not.toMatch(/answer/i);

    act(() => root?.unmount());
    root = null;
    document.body.innerHTML = "";
    const nav = mount(createElement(MainNav));
    const link = nav.querySelector('a[href="/verses"]');
    expect(link?.textContent).toBe("My Verses");
  });
});
