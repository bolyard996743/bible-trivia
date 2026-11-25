// @vitest-environment happy-dom
import fs from "fs";
import path from "path";
import { createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NKJV_COPYRIGHT } from "@/lib/bible/notice";
import { noopScriptureCache } from "@/lib/bible/scripture-cache";
import {
  DONATE_DISCLOSURE,
  DONATE_TIERS,
  liveDonateTiers,
  type DonateTier,
} from "@/lib/donate";
import { loadDonateVerses } from "@/lib/donate-verses";
import {
  FAITHFUL_SEARCHER_DONATE_URL,
  GIVE_AS_LED_DONATE_URL,
  LAMP_LIGHTER_DONATE_URL,
  NOBLE_BEREAN_DONATE_URL,
  PILLAR_SUPPORTER_DONATE_URL,
  donateAnchorProps,
  isLiveDonateUrl,
} from "@/lib/donate-links";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children?: ReactNode }) =>
    createElement("a", { ...props, href }, children),
}));

import { DonateScreen, DonateTierCard } from "@/components/DonateScreen";
import { SiteFooter } from "@/components/SiteFooter";

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "coverage",
  "dist",
  "out",
  "playwright-report",
  "test-results",
]);
const BINARY = /\.(png|jpe?g|gif|webp|ico|woff2?|pdf|mp4|zip)$/i;

const LAMP_TEXT = "Your word is a lamp to my feet And a light to my path.";
const GIFT_TEXT =
  "So let each one give as he purposes in his heart, not grudgingly or of necessity; for God loves a cheerful giver.";

let root: Root | null = null;

function render(node: ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(node);
  });
  return container;
}

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

function filesInRepo(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...filesInRepo(full));
    else if (entry.isFile() && !BINARY.test(entry.name)) out.push(full);
  }
  return out;
}

function tier(id: string): DonateTier {
  const found = DONATE_TIERS.find((item) => item.id === id);
  if (!found) throw new Error(id);
  return found;
}

describe("donate page", () => {
  it("reads every gift from the link config", () => {
    expect(DONATE_TIERS.map((item) => [item.id, item.href])).toEqual([
      ["lamp-lighter", LAMP_LIGHTER_DONATE_URL],
      ["faithful-searcher", FAITHFUL_SEARCHER_DONATE_URL],
      ["noble-berean", NOBLE_BEREAN_DONATE_URL],
      ["pillar-supporter", PILLAR_SUPPORTER_DONATE_URL],
      ["give-as-led", GIVE_AS_LED_DONATE_URL],
    ]);
    expect(LAMP_LIGHTER_DONATE_URL).toBe("https://buy.stripe.com/5kQaEYg181If7dc5Kz9k401");
    expect(FAITHFUL_SEARCHER_DONATE_URL).toBe("https://buy.stripe.com/9B67sMeX4cmTeFE8WL9k402");
    expect(NOBLE_BEREAN_DONATE_URL).toBe("https://buy.stripe.com/5kQ00kbKS72zgNMc8X9k403");
    expect(PILLAR_SUPPORTER_DONATE_URL).toBe("https://buy.stripe.com/9B67sMg18fz5fJIdd19k404");
    expect(GIVE_AS_LED_DONATE_URL).toBeNull();
    expect(liveDonateTiers().map((item) => item.id)).toEqual([
      "lamp-lighter",
      "faithful-searcher",
      "noble-berean",
      "pillar-supporter",
    ]);
  });

  it("keeps the custom gift in the config and off the page until it has a link", () => {
    const custom = tier("give-as-led");
    expect(custom.name).toBe("Give as You're Led");
    expect(custom.amountLabel).toBe("Custom");
    expect(custom.description).toBe("Any amount is a blessing");
    expect(custom.verse?.label).toBe("2 Corinthians 9:7 (NKJV)");
    expect(custom.verse?.fallbackText).toBe(GIFT_TEXT);
    expect(isLiveDonateUrl(null)).toBe(false);
    expect(isLiveDonateUrl("")).toBe(false);
    expect(isLiveDonateUrl("TODO")).toBe(false);
    expect(liveDonateTiers([{ ...custom, href: null }])).toEqual([]);
    expect(liveDonateTiers([{ ...custom, href: "" }])).toEqual([]);

    const hidden = render(createElement(DonateTierCard, { tier: custom, verse: null }));
    expect(hidden.querySelector("[data-testid=donate-tier]")).toBeNull();
    act(() => root?.unmount());

    const href = "https://example.com/give";
    const shown = render(
      createElement(DonateScreen, {
        tiers: DONATE_TIERS.map((item) => (item.id === "give-as-led" ? { ...item, href } : item)),
      }),
    );
    const card = shown.querySelector('[data-tier="give-as-led"]');
    expect(card).not.toBeNull();
    expect(card?.textContent).toContain("Give as You're Led");
    expect(card?.textContent).toContain("Any amount is a blessing");
    expect(card?.textContent).toContain("2 Corinthians 9:7 (NKJV)");
    expect(card?.textContent).toContain(GIFT_TEXT);
    const anchor = card?.querySelector("a");
    expect(anchor?.getAttribute("href")).toBe(href);
    expect(anchor?.getAttribute("target")).toBe("_blank");
    expect(anchor?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(donateAnchorProps(href)).toEqual({ href, target: "_blank", rel: "noopener noreferrer" });
  });

  it("renders the four live gifts, the disclosure, and a new-tab link for each", () => {
    const page = render(createElement(DonateScreen));
    expect(page.querySelector("[data-testid=donate-disclosure]")?.textContent).toBe(DONATE_DISCLOSURE);
    expect(page.textContent).toContain(LAMP_TEXT);
    expect(page.textContent).toContain("Psalm 119:105 (NKJV)");
    expect(page.textContent).toContain(NKJV_COPYRIGHT);
    expect(page.textContent).toContain("Scripture from");
    expect(page.querySelector("[data-testid=scripture-notice]")).not.toBeNull();
    expect(page.textContent).not.toContain("Give as You're Led");
    expect(page.textContent).not.toContain("Coming soon");
    expect(page.textContent).not.toMatch(
      /\b(difficulty|easy|intermediate|advanced|expert|child|children|teen|teens|adult|adults|older|younger)\b/i,
    );
    expect(page.querySelector("form, input, iframe")).toBeNull();
    expect(page.innerHTML).not.toContain("js.stripe.com");

    const main = page.querySelector("[data-testid=donate-main]");
    expect(main?.textContent).toContain("Donate");
    expect(main?.getAttribute("href")).toBe("#donate-tiers");
    expect(main?.getAttribute("target")).toBeNull();

    const cards = page.querySelectorAll("[data-testid=donate-tier]");
    expect(cards).toHaveLength(4);
    for (const item of liveDonateTiers()) {
      const card = page.querySelector(`[data-tier="${item.id}"]`);
      expect(card?.textContent).toContain(item.amountLabel);
      expect(card?.textContent).toContain(item.name);
      expect(card?.textContent).toContain(item.description);
      const anchor = card?.querySelector("a");
      expect(anchor?.getAttribute("href")).toBe(item.href);
      expect(anchor?.getAttribute("target")).toBe("_blank");
      expect(anchor?.getAttribute("rel")).toBe("noopener noreferrer");
    }

    const pageSource = fs.readFileSync(path.join(process.cwd(), "src/app/donate/page.tsx"), "utf8");
    expect(pageSource).toContain('title: "Donate · Noble Bereans"');
    expect(pageSource).toContain("Give to keep Noble Bereans free. Gifts are not tax-deductible yet.");
    const home = fs.readFileSync(path.join(process.cwd(), "src/components/HomeClient.tsx"), "utf8");
    expect(home).toContain('href="/donate"');
    expect(home).toContain('data-testid="home-donate"');
  });

  it("puts Donate in the footer", () => {
    const footer = render(createElement(SiteFooter));
    const link = footer.querySelector("[data-testid=footer-donate]");
    expect(link?.getAttribute("href")).toBe("/donate");
    expect(link?.textContent).toBe("Donate");
    expect(footer.querySelector("[data-testid=site-footer]")).not.toBeNull();
  });

  it("loads NKJV wording and a FUMS token for gifts that are on the page", async () => {
    const missing = await loadDonateVerses({ key: null, cache: noopScriptureCache });
    expect(missing["lamp-lighter"]?.text).toBe(LAMP_TEXT);
    expect(missing["lamp-lighter"]?.copyright).toBe(NKJV_COPYRIGHT);
    expect(missing["lamp-lighter"]?.fumsToken).toBeNull();
    expect(missing["give-as-led"]).toBeUndefined();

    const fetchImpl = async (input: string) => {
      const url = String(input);
      if (!url.includes("/chapters/PSA.119")) return new Response("no", { status: 404 });
      const body = {
        data: {
          content: [
            {
              name: "para",
              type: "tag",
              items: [
                {
                  name: "verse",
                  type: "tag",
                  attrs: { number: "105" },
                  items: [{ type: "text", text: "105" }],
                },
                {
                  type: "text",
                  text: `${LAMP_TEXT} `,
                  attrs: { verseId: "PSA.119.105" },
                },
              ],
            },
          ],
          copyright:
            "Scripture taken from the New King James Version. Copyright © 1982 by Thomas Nelson. Used by permission. All rights reserved.",
        },
        meta: { fumsToken: "fums-donate-test" },
      };
      return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
    };
    const loaded = await loadDonateVerses({
      fetch: fetchImpl,
      key: "test-key",
      cache: noopScriptureCache,
    });
    expect(loaded["lamp-lighter"]?.text).toBe(LAMP_TEXT);
    expect(loaded["lamp-lighter"]?.fumsToken).toBe("fums-donate-test");
    expect(loaded["lamp-lighter"]?.copyright).toContain("Thomas Nelson");
    expect(loaded["give-as-led"]).toBeUndefined();

    const withToken = render(
      createElement(DonateScreen, {
        verses: {
          "lamp-lighter": {
            text: LAMP_TEXT,
            copyright: NKJV_COPYRIGHT,
            fumsToken: "fums-donate-test",
          },
        },
      }),
    );
    expect(withToken.textContent).toContain(LAMP_TEXT);
    expect(withToken.querySelector("[data-testid=scripture-notice]")).not.toBeNull();
  });

  it("does not keep the combined payment link anywhere in the repo", () => {
    const forbidden = ["https://buy.stripe.com/", ["6oU8wQ", "8yG9aH", "410dd19k400"].join("")].join("");
    const found = new Set<string>();
    for (const file of filesInRepo(process.cwd())) {
      const text = fs.readFileSync(file, "utf8");
      expect(text, path.relative(process.cwd(), file)).not.toContain(forbidden);
      for (const match of text.matchAll(/https:\/\/buy\.stripe\.com\/[A-Za-z0-9]+/g)) found.add(match[0]);
    }
    expect([...found].sort()).toEqual(
      [
        LAMP_LIGHTER_DONATE_URL,
        FAITHFUL_SEARCHER_DONATE_URL,
        NOBLE_BEREAN_DONATE_URL,
        PILLAR_SUPPORTER_DONATE_URL,
      ].sort(),
    );
  });
});
