/**
 * One payment link per gift.
 * Paste an https link over a null or empty value to show that card.
 * No other file needs to change.
 */

export const LAMP_LIGHTER_DONATE_URL = "https://buy.stripe.com/5kQaEYg181If7dc5Kz9k401";

export const FAITHFUL_SEARCHER_DONATE_URL = "https://buy.stripe.com/9B67sMeX4cmTeFE8WL9k402";

export const NOBLE_BEREAN_DONATE_URL = "https://buy.stripe.com/5kQ00kbKS72zgNMc8X9k403";

export const PILLAR_SUPPORTER_DONATE_URL = "https://buy.stripe.com/9B67sMg18fz5fJIdd19k404";

/** Custom amount. */
export const GIVE_AS_LED_DONATE_URL: string | null = "https://buy.stripe.com/14A28saGOev12WWfl99k405";

/** True only for a real https link. Empty, null, and TODO values stay off the page. */
export function isLiveDonateUrl(url: string | null | undefined): url is string {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed || /^todo\b/i.test(trimmed)) return false;
  try {
    return new URL(trimmed).protocol === "https:";
  } catch {
    return false;
  }
}

export function donateAnchorProps(
  url: string | null | undefined,
): { href: string; target: "_blank"; rel: "noopener noreferrer" } | null {
  if (!isLiveDonateUrl(url)) return null;
  return { href: url.trim(), target: "_blank", rel: "noopener noreferrer" };
}
