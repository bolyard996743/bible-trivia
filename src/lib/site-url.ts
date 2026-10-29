/** Production host after the Vercel project rename. Previews use lamp-and-path-git-*. */
export const PRODUCTION_ORIGIN = "https://lamp-and-path.vercel.app";

function vercelOrigin(): string | null {
  const host = process.env.VERCEL_URL?.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!host) return null;
  return `https://${host}`;
}

/**
 * Origin for links that must match the site the player is on.
 * The browser uses window.location.origin. A build uses VERCEL_URL.
 * Anywhere else, the production name is the fallback.
 */
export function siteOrigin(): string {
  if (typeof window !== "undefined" && typeof window.location?.origin === "string" && window.location.origin) {
    return window.location.origin;
  }
  return vercelOrigin() ?? PRODUCTION_ORIGIN;
}

export function authCallbackUrl(): string {
  return `${siteOrigin()}/auth/callback`;
}
