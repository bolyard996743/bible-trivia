import fs from "fs";
import { expect, test } from "@playwright/test";

const pathFile = JSON.parse(fs.readFileSync("content/knowledge_path.json", "utf8")) as {
  stages: { badges: { id: string; questionIds: string[] }[] }[];
};
const creation = pathFile.stages[0]?.badges.find((badge) => badge.id === "seed-creation");
const creationIds = creation?.questionIds ?? [];

test("badges and progress stay with the player across reload and guide changes", async ({ page }) => {
  expect(creationIds.length).toBeGreaterThan(1);
  const current = {
    version: 1,
    ageGroup: "child",
    mascot: "judah",
    soundOn: false,
    placementComplete: true,
    placement: { cycle: 1, tier: "foundation", earned: 2, possible: 13, stage: "Seed" },
    progress: {
      cycle: 1,
      tier: "foundation",
      stage: "Seed",
      masteredIds: [],
      firstTryIds: [],
      streak: 0,
      bestStreak: 1,
      seasonMasteredCount: 0,
      points: 5,
    },
    lastVisitedOn: "2026-10-01",
    celebration: null,
  };
  const legacy = {
    ...current,
    mascot: "hunter",
    placement: { cycle: 1, tier: "foundation", earned: 9, possible: 13, stage: "Sprout" },
    progress: {
      ...current.progress,
      stage: "Sprout",
      masteredIds: creationIds,
      firstTryIds: creationIds,
      points: 40,
      bestStreak: 6,
      openAttempt: { questionId: creationIds[0], missCount: 2, phase: "teaching" },
    },
  };

  await page.addInitScript(
    ({ storageKey, currentState, legacyState }) => {
      if (localStorage.getItem("player-progress-seeded") === "1") return;
      localStorage.setItem("player-progress-seeded", "1");
      localStorage.setItem(
        "bible-trivia-age-gate-v1",
        JSON.stringify({ version: 1, bracket: "child", under13: true }),
      );
      localStorage.setItem(storageKey, JSON.stringify(currentState));
      localStorage.setItem(`${storageKey}:hunter`, JSON.stringify(legacyState));
    },
    { storageKey: "bible-trivia-v1", currentState: current, legacyState: legacy },
  );

  await page.goto("/path");
  await expect(page.getByTestId("badge-seed-creation")).toHaveAttribute("data-state", "earned");
  await expect(page.getByTestId("badge-seed-noah")).toHaveAttribute("data-state", "empty");
  await expect(page.getByTestId("stage-block-sprout")).toBeVisible();
  const merged = await page.evaluate(() => {
    const raw = localStorage.getItem("bible-trivia-v1");
    return {
      legacy: localStorage.getItem("bible-trivia-v1:hunter"),
      state: raw ? JSON.parse(raw) : null,
    };
  });
  expect(merged.legacy).toBeNull();
  expect(merged.state.mascot).toBe("judah");
  expect(merged.state.progress.stage).toBe("Sprout");
  expect(merged.state.progress.points).toBe(40);
  expect(merged.state.placement.stage).toBe("Sprout");
  expect(merged.state.progress.firstTryIds).toEqual(expect.arrayContaining(creationIds));

  await page.reload();
  await expect(page.getByTestId("badge-seed-creation")).toHaveAttribute("data-state", "earned");

  await page.goto("/settings");
  await page.getByRole("radio", { name: /Agnes/ }).check();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/home/);
  await expect(page.getByTestId("path-position")).toContainText("Sprout");
  await page.goto("/path");
  await expect(page.getByTestId("badge-seed-creation")).toHaveAttribute("data-state", "earned");

  await page.goto("/profile");
  await page.getByRole("radio", { name: /Judah/ }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/home/);
  await page.reload();
  await page.goto("/path");
  await expect(page.getByTestId("badge-seed-creation")).toHaveAttribute("data-state", "earned");
  await expect(page.getByTestId("stage-block-sprout")).toBeVisible();
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem("bible-trivia-v1") ?? "{}"));
  expect(after.mascot).toBe("judah");
  expect(after.progress.points).toBe(40);
  expect(after.progress.firstTryIds).toEqual(expect.arrayContaining(creationIds));
});
