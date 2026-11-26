import "server-only";
import { loadPassage } from "@/lib/bible/api-bible";
import { NKJV_COPYRIGHT } from "@/lib/bible/notice";
import type { ScriptureCache } from "@/lib/bible/scripture-cache";
import { liveDonateTiers, type DonateTier, type ShownVerse } from "@/lib/donate";

type PassageDeps = {
  fetch?: (input: string, init?: RequestInit) => Promise<Response>;
  key?: string | null;
  cache?: ScriptureCache;
  now?: () => number;
};

/**
 * NKJV wording for the gifts that are on the page.
 * A tier with no link is not fetched. Adding a link includes its verse on the next load.
 */
export async function loadDonateVerses(
  deps?: PassageDeps,
  tiers: readonly DonateTier[] = liveDonateTiers(),
): Promise<Record<string, ShownVerse>> {
  const withVerses = tiers.filter((tier) => tier.verse);
  const pairs = await Promise.all(
    withVerses.map(async (tier) => [tier.id, await loadOne(tier, deps)] as const),
  );
  return Object.fromEntries(pairs);
}

async function loadOne(tier: DonateTier, deps?: PassageDeps): Promise<ShownVerse> {
  const verse = tier.verse;
  if (!verse) return { text: "", copyright: NKJV_COPYRIGHT, fumsToken: null };
  try {
    const result = await loadPassage(verse.reference, deps);
    if (result.ok) {
      const text = result.data.verses
        .map((item) => item.text.trim())
        .filter((item) => item.length > 0)
        .join(" ");
      if (text) {
        return {
          text,
          copyright: result.data.copyright || NKJV_COPYRIGHT,
          fumsToken: result.data.fumsToken,
        };
      }
    }
  } catch {
    console.error("Donate verse could not be loaded");
  }
  return { text: verse.fallbackText, copyright: NKJV_COPYRIGHT, fumsToken: null };
}
