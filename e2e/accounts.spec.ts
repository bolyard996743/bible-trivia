import { expect, test } from "@playwright/test";
import { enterBirthday } from "./birthday";

function watchSupabaseWrites(page: import("@playwright/test").Page) {
  const writes: string[] = [];
  const urls: string[] = [];
  page.on("request", (request) => {
    if (!/supabase\.co/i.test(request.url())) return;
    urls.push(request.url());
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
      writes.push(`${request.method()} ${request.url()}`);
    }
  });
  return { writes, urls };
}

test("the birthday screen does not suggest an age", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Noble Bereans" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "When is your birthday?" })).toBeVisible();
  await expect(page.getByTestId("birth-month")).toHaveValue("");
  await expect(page.getByTestId("birth-day")).toHaveValue("");
  await expect(page.getByTestId("birth-year")).toHaveValue("");
  const copy = (await page.getByTestId("age-gate").innerText()).toLowerCase();
  expect(copy).not.toContain("must be");
  expect(copy).not.toContain("13+");
  expect(copy).not.toContain("age group");
});

test("age 13 and older can play on this device after a warning", async ({ page }) => {
  const { writes, urls } = watchSupabaseWrites(page);
  await page.goto("/");
  const year = await enterBirthday(page, 20);
  await expect(page.getByTestId("age-choice")).toBeVisible();
  await page.getByTestId("play-without-account").click();
  await expect(page.getByTestId("local-progress-warning")).toContainText("only on this device");
  await expect(page.getByTestId("local-progress-warning")).toContainText("create an account later");
  await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(() => localStorage.getItem("bible-trivia-birth-v1"))).toBeNull();

  await page.getByTestId("confirm-local-play").click();
  await expect(page).toHaveURL(/\/profile/);
  await expect(page.getByTestId("account-required")).toHaveCount(0);
  const stored = await page.evaluate(() => ({
    gate: localStorage.getItem("bible-trivia-age-gate-v1") ?? "",
    birth: localStorage.getItem("bible-trivia-birth-v1") ?? "",
  }));
  expect(stored.birth).toContain(String(year));
  expect(stored.gate).not.toContain(String(year));
  await expect(page.getByTestId("turn-13-prompt")).toHaveCount(0);

  await page.goto("/settings");
  await expect(page.getByTestId("create-account")).toBeVisible();
  await page.goto("/play");
  await expect(page.getByTestId("account-required")).toHaveCount(0);
  await page.goto("/leaderboards");
  await expect(page.getByTestId("near-you-board")).toBeVisible();
  await expect(page.getByTestId("device-points")).toContainText("just on this device");
  await expect(page.getByTestId("top-board")).toHaveCount(0);
  expect(writes).toEqual([]);
  for (const url of urls) expect(url).not.toContain(String(year));
});

test("creating an account is offered from the birthday choice", async ({ page }) => {
  await page.goto("/");
  await enterBirthday(page, 20);
  await page.getByTestId("choose-create-account").click();
  await expect(page).toHaveURL(/\/account/);
  await expect(page.getByTestId("account-email")).toBeVisible();
  await expect(page.getByTestId("account-password")).toBeVisible();
  await expect(page.getByTestId("account-username")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue as guest" })).toHaveCount(0);
});

test("a child keeps the birthday on the device and is not listed", async ({ page }) => {
  const { writes, urls } = watchSupabaseWrites(page);
  await page.goto("/");
  const year = await enterBirthday(page, 8);
  await expect(page).toHaveURL(/\/profile/);
  await expect(page.getByTestId("child-local-only")).toBeVisible();
  await expect(page.getByTestId("account-email")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Account" })).toHaveCount(0);

  const stored = await page.evaluate(() => ({
    gate: localStorage.getItem("bible-trivia-age-gate-v1") ?? "",
    birth: localStorage.getItem("bible-trivia-birth-v1") ?? "",
  }));
  expect(JSON.parse(stored.gate)).toEqual({ version: 1, bracket: "child", under13: true });
  expect(stored.birth).toContain(String(year));
  expect(stored.gate).not.toContain(String(year));

  await page.goto("/");
  await expect(page.getByTestId("birth-year")).toHaveCount(0);
  await page.goto("/settings");
  await expect(page.getByTestId("create-account")).toHaveCount(0);
  await page.goto("/leaderboards");
  await expect(page.getByTestId("near-you-board")).toBeVisible();
  await expect(page.getByTestId("device-points")).toContainText("just on this device");
  await expect(page.getByTestId("top-board")).toHaveCount(0);
  expect(writes).toEqual([]);
  for (const url of urls) expect(url).not.toContain(String(year));
});

test("a player who turns 13 is asked once", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-29T12:00:00") });
  await page.addInitScript(() => {
    const today = new Date();
    localStorage.setItem(
      "bible-trivia-birth-v1",
      JSON.stringify({
        year: today.getFullYear() - 13,
        month: today.getMonth() + 1,
        day: today.getDate(),
        recordedUnder13: true,
      }),
    );
    localStorage.setItem(
      "bible-trivia-age-gate-v1",
      JSON.stringify({ version: 1, bracket: "child", under13: true }),
    );
  });
  await page.goto("/");
  await expect(page.getByTestId("turn-13-prompt")).toBeVisible();
  await page.getByTestId("turn-13-create").click();
  await expect(page).toHaveURL(/\/account/);
  await expect(page.getByTestId("turn-13-prompt")).toHaveCount(0);
  await page.goto("/");
  await expect(page.getByTestId("turn-13-prompt")).toBeVisible();
  await page.getByRole("button", { name: "Not now" }).click();
  await expect(page.getByTestId("turn-13-prompt")).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("turn-13-prompt")).toHaveCount(0);
});
