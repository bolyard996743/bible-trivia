import { expect, test, type Page } from "@playwright/test";
import { enterBirthday } from "./birthday";

const CHAPTER = {
  ok: true,
  chapter: {
    bookId: "GEN",
    chapter: 1,
    copyright:
      "Scripture taken from the New King James Version®. Copyright © 1982 by Thomas Nelson. Used by permission. All rights reserved.",
    fumsToken: "fums-token-test",
    verses: [
      { bookId: "GEN", chapter: 1, verse: 1, text: "Alpha created the sample." },
      { bookId: "GEN", chapter: 1, verse: 2, text: "Second sample line." },
    ],
  },
};

async function openBible(page: Page) {
  await page.goto("/");
  await enterBirthday(page, 8);
  await page.goto("/bible");
}

test("the Bible tab explains when scripture text is not set up", async ({ page }) => {
  await openBible(page);
  await expect(page).toHaveURL(/\/bible$/);
  await expect(page.getByRole("heading", { name: "Bible" })).toBeVisible();
  await page.getByTestId("book-GEN").click();
  await page.getByTestId("chapter-1").click();
  await expect(page.getByTestId("bible-unavailable")).toContainText("isn't available");
  const main = (await page.locator("main").innerText()).toLowerCase();
  expect(main).not.toContain("in the beginning");
  expect(main).not.toContain("for god so loved");
  expect(main).not.toContain("alpha created");
});

test("a reader can open a chapter, see the notice, and save a note by reference", async ({ page }) => {
  await page.route("**/api/bible/chapter**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "Cache-Control": "private, no-store" },
      body: JSON.stringify(CHAPTER),
    });
  });
  await openBible(page);
  await expect.poll(() => page.evaluate(() => typeof window.fums)).toBe("function");
  await expect(page.locator('script[src="https://pkg.api.bible/fumsV3.min.js"]')).toHaveCount(1);
  await page.getByTestId("book-GEN").click();
  await page.getByTestId("chapter-1").click();
  await expect(page.getByRole("heading", { name: "Genesis 1" })).toBeVisible();
  await expect(page.getByTestId("verse-1")).toContainText("Alpha created the sample.");
  const notice = page.getByTestId("scripture-notice");
  await expect(notice).toContainText("Thomas Nelson");
  await expect(notice).toContainText("New King James");
  await expect(notice.getByRole("link", { name: "API.Bible" })).toHaveAttribute("href", "https://api.bible");

  await page.getByTestId("highlight-verse-1").click();
  await page.getByTestId("highlight-gold").click();
  await page.getByTestId("verse-note-input").fill("A note I wrote");
  await page.getByTestId("save-note").click();
  await expect(page.getByTestId("verse-1").getByTestId("verse-note-text")).toHaveText("A note I wrote");

  const raw = await page.evaluate(() => localStorage.getItem("bible-trivia-marks-v1"));
  expect(raw).toContain("A note I wrote");
  expect(raw).toContain("GEN");
  expect(raw).not.toContain("Alpha created");
  expect(raw).not.toContain("Second sample");

  await page.reload();
  await expect(page.getByTestId("verse-1").getByTestId("verse-note-text")).toHaveText("A note I wrote");
  await expect(page.getByTestId("verse-1")).toHaveAttribute("data-highlight", "gold");
});
