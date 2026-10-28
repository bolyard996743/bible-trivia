import { expect, test } from "@playwright/test";

test("the Bible tab opens the coming-soon placeholder", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Bible" }).click();
  await expect(page).toHaveURL(/\/bible$/);
  await expect(page.getByRole("heading", { name: "Bible" })).toBeVisible();
  await expect(page.getByTestId("bible-placeholder")).toHaveText(
    "Bible reading, highlights, and notes coming soon",
  );
  const main = (await page.locator("main").innerText()).toLowerCase();
  expect(main).not.toContain("in the beginning");
  expect(main).not.toContain("for god so loved");
});
