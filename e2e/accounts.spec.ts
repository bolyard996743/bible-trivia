import { expect, test } from "@playwright/test";

test("a guest can start without signing in", async ({ page }) => {
  await page.goto("/profile");
  await page.getByRole("radio", { name: /Adult/ }).check();
  await page.getByRole("radio", { name: /Judah the Lion/ }).check();
  await expect(page.getByTestId("sign-in-link")).toBeVisible();
  await page.getByRole("button", { name: "Continue as guest" }).click();
  await expect(page.getByRole("heading", { name: "A short placement" })).toBeVisible();
  await expect(page.getByTestId("account-email")).toHaveCount(0);
});

test("a child has no sign-in", async ({ page }) => {
  await page.goto("/profile");
  await page.getByRole("radio", { name: /Child/ }).check();
  await expect(page.getByTestId("sign-in-link")).toHaveCount(0);
  await expect(page.getByTestId("child-local-only")).toBeVisible();
  await expect(page.getByTestId("account-email")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Email me a sign-in link" })).toHaveCount(0);

  await page.evaluate(() => {
    localStorage.setItem(
      "bible-trivia-v1",
      JSON.stringify({
        version: 1,
        ageGroup: "child",
        mascot: "agnes",
        soundOn: false,
        placementComplete: true,
        placement: { cycle: 1, tier: "foundation", earned: 0, possible: 1, stage: "Seed" },
        progress: {
          cycle: 1,
          tier: "foundation",
          masteredIds: [],
          missCounts: {},
          streak: 0,
          bestStreak: 0,
          seasonMasteredCount: 0,
        },
        lastVisitedOn: null,
        celebration: null,
      }),
    );
  });
  await page.goto("/account");
  await expect(page.getByTestId("child-local-only")).toBeVisible();
  await expect(page.getByTestId("account-email")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Account" })).toHaveCount(0);
  await page.goto("/settings");
  await expect(page.getByTestId("sign-in-link")).toHaveCount(0);
});
