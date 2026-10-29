import type { Page } from "@playwright/test";

/** January 1, a fixed number of years before the browser's current date. */
export async function enterBirthday(page: Page, yearsAgo: number) {
  const year = await page.evaluate((ago) => new Date().getFullYear() - ago, yearsAgo);
  await page.getByTestId("birth-month").selectOption("1");
  await page.getByTestId("birth-day").selectOption("1");
  await page.getByTestId("birth-year").selectOption(String(year));
  await page.getByTestId("birth-continue").click();
  return year;
}
