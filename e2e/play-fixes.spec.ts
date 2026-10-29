import { expect, test } from "@playwright/test";

test("a child landing and settings do not mention an account", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "bible-trivia-age-gate-v1",
      JSON.stringify({ version: 1, bracket: "child", under13: true }),
    );
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Noble Bereans" })).toBeVisible();
  await expect(page.getByTestId("name-pronunciation")).toHaveText("(NO-bul buh-REE-unz)");
  await expect(page.getByTestId("name-meaning")).toHaveText(
    "The Bereans checked the Scriptures every day to see what was true. (See Acts 17:11)",
  );
  await expect(page.getByTestId("landing-note")).toHaveText("Your progress is saved on this device.");
  await expect(page.getByText(/create an account/i)).toHaveCount(0);
  await page.goto("/settings");
  await expect(page.getByText(/username cannot be changed/i)).toHaveCount(0);
  await expect(page.getByText(/create an account/i)).toHaveCount(0);
  await expect(page.getByTestId("child-local-only")).toHaveText("Your progress is saved on this device.");
});

test("13+ navigation stays on one row at desktop widths", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "bible-trivia-age-gate-v1",
      JSON.stringify({ version: 1, bracket: "adult", under13: false }),
    );
  });
  for (const width of [1024, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link", { name: "Account" })).toBeVisible();
    const tops = await nav.getByRole("link").evaluateAll((links) =>
      links.map((link) => Math.round(link.getBoundingClientRect().top)),
    );
    expect(tops).toHaveLength(6);
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(1);
    await expect(page.getByTestId("nav-menu")).toBeHidden();
  }
});

test("phone navigation stays behind a menu at 375px", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "bible-trivia-age-gate-v1",
      JSON.stringify({ version: 1, bracket: "adult", under13: false }),
    );
  });
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");
  const menu = page.getByTestId("nav-menu");
  await expect(menu).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link")).toHaveCount(0);
  await menu.click();
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Account" })).toBeVisible();
});

test("the stage map lists Seed topics and hides later checklists", async ({ page }) => {
  await page.addInitScript((key) => {
    localStorage.setItem(
      "bible-trivia-age-gate-v1",
      JSON.stringify({ version: 1, bracket: "child", under13: true }),
    );
    localStorage.setItem(
      key,
      JSON.stringify({
        version: 1,
        ageGroup: "child",
        mascot: "judah",
        soundOn: false,
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
        },
        lastVisitedOn: "2026-10-29",
        celebration: null,
      }),
    );
  }, "bible-trivia-v1");
  await page.goto("/path");
  await expect(page.getByTestId("stage-map")).toBeVisible();
  await expect(page.getByTestId("topic-creation")).toHaveAttribute("data-state", "open");
  await expect(page.getByTestId("topic-twelve-disciples")).toHaveCount(0);
});

test("choosing a mascot changes the theme immediately", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "bible-trivia-age-gate-v1",
      JSON.stringify({ version: 1, bracket: "child", under13: true }),
    );
  });
  await page.goto("/settings");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "default");
  await page.getByRole("radio", { name: /Hunter/ }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "hunter");
  await page.getByRole("radio", { name: /Agnes/ }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "agnes");
  await page.getByRole("radio", { name: /Judah/ }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "judah");
});
