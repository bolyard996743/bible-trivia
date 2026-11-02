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
  await expect(page.getByTestId("topic-creation")).toHaveAttribute("data-state", "cleared");
  await expect(page.getByTestId("topic-creation")).toHaveText("Creation");
  await expect(page.getByTestId("topic-david-goliath")).toHaveText("David and Goliath");
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

test("difficulty labels stay hidden until settings turns them on", async ({ page }) => {
  await install(page, seed({}));
  await page.goto("/play");
  await expect(page.getByTestId("difficulty-label")).toHaveCount(0);
  await page.goto("/settings");
  const toggle = page.getByTestId("difficulty-toggle");
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await toggle.click();
  await page.getByRole("button", { name: "Save" }).click();
  await page.goto("/play");
  await expect(page.getByTestId("difficulty-label")).toHaveText("Foundation");
});
