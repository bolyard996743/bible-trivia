// @vitest-environment happy-dom
import fs from "fs";
import path from "path";
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children?: ReactNode }) =>
    createElement("a", { ...props, href }, children),
}));

vi.mock("@/lib/bible/passage-client", () => ({
  peekPassage: () => null,
  prefetchPassages: () => {},
  loadPassageCached: () => Promise.resolve({ ok: false, message: "Scripture text isn't available on this copy of the app yet." }),
}));

import { BadgeShelf } from "@/components/BadgeShelf";
import { StageMap } from "@/components/StageMap";
import { loadCatalog } from "@/lib/content/load";
import {
  BADGE_UNLOCK_KEY,
  lockShakeMode,
  nextLockedBadgeId,
  planUnlock,
  readUnlockPlayed,
  unlockShelfClass,
  writeUnlockPlayed,
} from "@/lib/game/badge-unlock";
import { knowledgePath, type PathBadge } from "@/lib/game/path";
import { emptyProgress } from "@/lib/game/progression";
import type { GameProgress } from "@/lib/game/types";

const { questions } = loadCatalog();

function badgeById(id: string): PathBadge {
  const badge = knowledgePath.stages.flatMap((stage) => stage.badges).find((item) => item.id === id);
  if (!badge) throw new Error(id);
  return badge;
}

function earnedProgress(ids: readonly string[], stage: GameProgress["stage"] = "Seed"): GameProgress {
  const badgeRetries: NonNullable<GameProgress["badgeRetries"]> = {};
  for (const id of ids) {
    badgeRetries[id] = { correctIds: [...badgeById(id).questionIds] };
  }
  return { ...emptyProgress(), stage, badgeRetries };
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

let root: Root | null = null;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
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

describe("badge unlock plays once", () => {
  it("treats badges already earned as played, then notices one new badge", () => {
    const first = planUnlock(null, ["seed-creation"]);
    expect(first.fresh).toEqual([]);
    expect(first.played).toEqual(["seed-creation"]);
    const next = planUnlock(first.played, ["seed-creation", "seed-noah"]);
    expect(next.fresh).toEqual(["seed-noah"]);
    expect(planUnlock(next.played, ["seed-creation", "seed-noah"]).fresh).toEqual([]);
    expect(unlockShelfClass(true, false)).toBe("badge-unlock-flip");
    expect(unlockShelfClass(true, true)).toBe("badge-unlock-glow");
    expect(unlockShelfClass(false, false)).toBe("");
    expect(lockShakeMode(true, false)).toBe("shake");
    expect(lockShakeMode(true, true)).toBe("still");
    expect(lockShakeMode(false, false)).toBe("none");
  });

  it("keeps the shelf and the map separate, and ignores a broken record", () => {
    const storage = memory();
    expect(readUnlockPlayed(storage, "local", "shelf")).toBeNull();
    writeUnlockPlayed(storage, "local", "shelf", ["seed-creation"]);
    expect(readUnlockPlayed(storage, "local", "map")).toBeNull();
    expect(readUnlockPlayed(storage, "ada@example.com", "shelf")).toBeNull();
    writeUnlockPlayed(storage, "ada@example.com", "map", ["seed-noah"]);
    expect(readUnlockPlayed(storage, "local", "shelf")).toEqual(["seed-creation"]);
    expect(readUnlockPlayed(storage, "ada@example.com", "map")).toEqual(["seed-noah"]);
    storage.setItem(BADGE_UNLOCK_KEY, "{not json");
    expect(readUnlockPlayed(storage, "local", "shelf")).toBeNull();
    const saved = writeUnlockPlayed(storage, "local", "shelf", ["seed-creation", "seed-creation", ""]);
    expect(saved).toEqual(["seed-creation"]);
    expect(storage.getItem(BADGE_UNLOCK_KEY)).not.toMatch(/prompt|choice|answer/i);
  });

  it("points the lock shake at the next unearned badge on the map", () => {
    expect(nextLockedBadgeId(emptyProgress())).toBe("seed-creation");
    expect(nextLockedBadgeId(earnedProgress(["seed-creation"]))).toBe("seed-noah");
    const seedIds = knowledgePath.stages
      .find((stage) => stage.stage === "Seed")
      ?.badges.filter((badge) => badge.questionIds.length > 0)
      .map((badge) => badge.id) ?? [];
    const fruitful = knowledgePath.stages
      .find((stage) => stage.stage === "Fruitful")
      ?.badges.find((badge) => badge.questionIds.length > 0);
    expect(fruitful).toBeTruthy();
    expect(nextLockedBadgeId(earnedProgress(seedIds))).toBe(fruitful?.id);
  });

  it("flips a new shelf badge once, and only a glow when motion is reduced", () => {
    const progress = earnedProgress(["seed-creation"]);
    const first = mount(
      createElement(BadgeShelf, { progress, questions, playerKey: "local", reducedMotion: false }),
    );
    expect(first.querySelector('[data-testid="shelf-badge-seed-creation"]')?.getAttribute("data-unlock")).toBeNull();
    const seeded = readUnlockPlayed(window.localStorage, "local", "shelf");
    expect(seeded).toEqual(["seed-creation"]);

    act(() => root?.unmount());
    root = null;
    writeUnlockPlayed(window.localStorage, "local", "shelf", []);
    const fresh = mount(
      createElement(BadgeShelf, { progress, questions, playerKey: "local", reducedMotion: false }),
    );
    const flipped = fresh.querySelector('[data-testid="shelf-badge-seed-creation"]');
    expect(flipped?.getAttribute("data-unlock")).toBe("badge-unlock-flip");
    expect(flipped?.innerHTML).toContain("badge-unlock-flip");
    expect(readUnlockPlayed(window.localStorage, "local", "shelf")).toEqual(["seed-creation"]);

    act(() => root?.unmount());
    root = null;
    const again = mount(
      createElement(BadgeShelf, { progress, questions, playerKey: "local", reducedMotion: false }),
    );
    expect(again.querySelector('[data-testid="shelf-badge-seed-creation"]')?.getAttribute("data-unlock")).toBeNull();

    const quiet = renderToStaticMarkup(
      createElement(BadgeShelf, {
        progress,
        questions,
        playerKey: "local",
        celebrateIds: ["seed-creation"],
        reducedMotion: true,
      }),
    );
    expect(quiet).toContain("badge-unlock-glow");
    expect(quiet).not.toContain("badge-unlock-flip");
  });

  it("shakes only the next locked badge, and stays still when motion is reduced", () => {
    const progress = earnedProgress(["seed-creation"]);
    const html = renderToStaticMarkup(
      createElement(StageMap, {
        progress,
        seenBadgeIds: ["seed-creation"],
        reducedMotion: false,
        shakeBadgeId: "seed-noah",
      }),
    );
    const noah = html.slice(html.indexOf('data-testid="badge-seed-noah"') - 180, html.indexOf('data-testid="badge-seed-noah"') + 40);
    expect(noah).toContain('data-lock-shake="shake"');
    expect(noah).toContain("badge-lock-shake");
    const creation = html.slice(html.indexOf("badge-seed-creation") - 80, html.indexOf("badge-seed-creation") + 80);
    expect(creation).not.toContain("data-lock-shake");
    expect(html.match(/data-lock-shake="shake"/g)?.length).toBe(1);

    const still = renderToStaticMarkup(
      createElement(StageMap, {
        progress,
        seenBadgeIds: ["seed-creation"],
        reducedMotion: true,
        shakeBadgeId: "seed-noah",
      }),
    );
    expect(still).toContain('data-lock-shake="still"');
    expect(still).toContain("badge-lock-still");
    expect(still).not.toContain("badge-lock-shake");

    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    const allowed = css.slice(css.indexOf("@media (prefers-reduced-motion: no-preference)"), css.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(allowed).toContain(".badge-unlock-flip");
    expect(allowed).toContain(".badge-lock-shake .badge-chip");
    const reduced = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).toContain(".badge-unlock-flip");
    expect(reduced).toContain(".badge-lock-shake .badge-chip");
    expect(reduced).toContain(".badge-lock-shake .badge-emblem");
    expect(reduced).toContain("animation: none");
  });
});
