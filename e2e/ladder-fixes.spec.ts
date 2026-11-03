import { expect, test } from "@playwright/test";

const STORAGE_KEY = "bible-trivia-v1";

function seed(progress: Record<string, unknown>, showDifficulty = false) {
  return {
    version: 1,
    ageGroup: "child",
    mascot: "judah",
    soundOn: false,
    showDifficulty,
    placementComplete: true,
    placement: { cycle: 1, tier: "foundation", earned: 0, possible: 1, stage: "Seed" },
    progress: {
      cycle: 1,
      tier: "foundation",
      stage: "Seed",
      masteredIds: [],
      streak: 0,
      bestStreak: 0,
      seasonMasteredCount: 0,
      ...progress,
    },
    lastVisitedOn: "2026-11-02",
    celebration: null,
  };
}

async function install(page: import("@playwright/test").Page, state: unknown) {
  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(
        "bible-trivia-age-gate-v1",
        JSON.stringify({ version: 1, bracket: "child", under13: true }),
      );
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(value));
    },
    { key: STORAGE_KEY, value: state },
  );
}

test("the path checklist uses names and checks off a cleared topic", async ({ page }) => {
  await install(page, seed({}));
  await page.goto("/play");
  await expect(page.getByTestId("prompt")).toHaveText("Who made the heavens and the earth?");
  await expect(page.getByTestId("review-label")).toHaveCount(0);
  await expect(page.getByTestId("difficulty-label")).toHaveCount(0);
  await page.getByTestId("choice-b").click();
  await page.getByTestId("continue-button").click();
  await page.goto("/path");
  await expect(page.getByTestId("badge-genesis-1-11")).toHaveAttribute("data-state", "earned");
  await expect(page.getByTestId("badge-jonah-1")).toHaveAttribute("data-state", "empty");
  await expect(page.getByTestId("stage-block-sprout")).toHaveCount(0);
  await expect(page.getByText("Creation")).toHaveCount(0);
  await expect(page.getByText("David and Goliath")).toHaveCount(0);
  await expect(page.getByText("Sprout")).toHaveCount(0);
  await expect(page.getByText("david-goliath")).toHaveCount(0);
});

test("a reload keeps the miss count so the score is 5", async ({ page }) => {
  await install(page, seed({}));
  await page.goto("/play");
  await page.getByTestId("choice-a").click();
  await expect(page.getByTestId("teaching")).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("teaching")).toBeVisible();
  await page.getByTestId("ready-button").click();
  await page.getByTestId("choice-b").click();
  await page.getByTestId("continue-button").click();
  const points = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw).progress.points as number) : null;
  }, STORAGE_KEY);
  expect(points).toBe(5);
});

test("every 5th draw shows a Review label", async ({ page }) => {
  await install(
    page,
    seed({
      masteredIds: ["c1-gen-0001"],
      draw: 4,
      clearedTopics: ["creation"],
    }),
  );
  await page.goto("/play");
  await expect(page.getByTestId("review-label")).toHaveText("Review");
});

test("difficulty labels stay off settings and off the question", async ({ page }) => {
  await install(page, seed({}));
  await page.goto("/settings");
  await expect(page.getByTestId("difficulty-toggle")).toHaveCount(0);
  await expect(page.getByText("Difficulty labels")).toHaveCount(0);
  await page.goto("/play");
  await expect(page.getByTestId("difficulty-label")).toHaveCount(0);
  await page.goto("/home");
  await expect(page.getByTestId("path-position")).toHaveText("Seed · Cycle 1");
});

test("a dev flag can show the difficulty label", async ({ page }) => {
  await install(page, seed({}, true));
  await page.goto("/play?showDifficulty=1");
  await expect(page.getByTestId("difficulty-label")).toHaveText("Foundation");
});

test("a Seed player is not shown Psalm 119", async ({ page }) => {
  await install(page, seed({ cycle: 3, tier: "intermediate", stage: "Seed" }));
  await page.goto("/home");
  await expect(page.getByTestId("path-position")).toHaveText("Seed · Cycle 3");
  await expect(page.getByText("Current section: Psalm 119")).toHaveCount(0);
  await expect(page.getByText("Current section: Genesis 1-11")).toBeVisible();
  await expect(page.getByText("Intermediate")).toHaveCount(0);
});
