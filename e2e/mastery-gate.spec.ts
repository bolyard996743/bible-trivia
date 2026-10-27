import { expect, test } from "@playwright/test";

const STORAGE_KEY = "bible-trivia-v1";

test("a wrong answer teaches, then asks the same question again", async ({ page }) => {
  await page.addInitScript((key) => {
    localStorage.setItem(
      key,
      JSON.stringify({
        version: 1,
        ageGroup: "adult",
        mascot: "judah",
        soundOn: false,
        placementComplete: true,
        placement: {
          cycle: 1,
          tier: "foundation",
          earned: 0,
          possible: 1,
          stage: "Seed",
        },
        progress: {
          cycle: 1,
          tier: "foundation",
          masteredIds: [],
          streak: 0,
          bestStreak: 0,
          seasonMasteredCount: 0,
        },
        lastVisitedOn: null,
        celebration: null,
      }),
    );
  }, STORAGE_KEY);

  await page.goto("/play");
  const prompt = page.getByTestId("prompt");
  await expect(prompt).toHaveText("Who created the heavens and the earth?");

  await page.getByTestId("choice-a").click();
  const teaching = page.getByTestId("teaching");
  await expect(teaching).toBeVisible();
  await expect(page.getByTestId("mascot-line")).not.toBeEmpty();
  await expect(page.getByTestId("verse")).toContainText("Genesis 1:1");
  await expect(page.getByTestId("verse")).toContainText("NKJV");
  await expect(page.getByTestId("explanation")).toContainText("God");
  await expect(page.getByTestId("extended-explanation")).toHaveCount(0);
  await expect(page.getByTestId("ready-button")).toHaveText("I'm ready");

  await page.getByTestId("ready-button").click();
  await expect(page.getByTestId("teaching")).toHaveCount(0);
  await expect(page.getByTestId("prompt")).toHaveText("Who created the heavens and the earth?");

  await page.getByTestId("choice-a").click();
  await expect(page.getByTestId("extended-explanation")).toBeVisible();
  await expect(page.getByTestId("verse")).toContainText("In the beginning God created the heavens and the earth.");

  await page.getByTestId("ready-button").click();
  await expect(page.getByTestId("prompt")).toHaveText("Who created the heavens and the earth?");
  await page.getByTestId("choice-b").click();

  await expect(page.getByTestId("takeaway")).toHaveText("God created the heavens and the earth.");
  await expect(page.getByTestId("prompt")).toHaveCount(0);
});
